import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractPdfText, MAX_PDF_BYTES } from "../src/lib/pdf-text.ts";
import { readPdfDownload } from "../src/lib/pdf-download.mjs";
import { selectSourceExcerpts } from "../src/lib/source-excerpts.ts";

// Minimal real PDF fixtures; no extra dependency or external documents needed.
function pdf(pages = 1, text = "Verified evidence for access controls", padding = 0) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${pages} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (let i = 0; i < pages; i++) {
    const content = `BT /F1 0.2 Tf 20 700 Td (${text}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, i) => { offsets.push(output.length); output += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.concat([Buffer.from(output), Buffer.alloc(padding, 32)]);
}

async function temp(run) {
  const dir = await mkdtemp(join(tmpdir(), "pdf-test-"));
  try { await run(join(dir, "fixture.pdf")); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

test("PDF exceeding former 20 MB limit is streamed and extracted", () => temp(async path => {
  const bytes = pdf(1, undefined, 21 * 1024 * 1024);
  const result = await readPdfDownload(new Response(bytes), path, MAX_PDF_BYTES);
  assert.equal(result.bytes, bytes.length);
  const extracted = await extractPdfText(path);
  assert.equal(extracted.partial, false);
  assert.match(extracted.text, /Verified evidence/);
}));

test("200-page ceiling is explicitly partial", () => temp(async path => {
  await writeFile(path, pdf(201));
  const result = await extractPdfText(path);
  assert.equal(result.partial, true);
  assert.equal(result.pagesRead, 200);
  assert.equal(result.totalPages, 201);
  assert.match(result.note, /Extracción parcial/);
}));

test("character ceiling includes markers and never reports full extraction", () => temp(async path => {
  await writeFile(path, pdf(180, "access controls ".repeat(80)));
  const result = await extractPdfText(path);
  assert.equal(result.partial, true);
  assert.ok(result.text.length <= 160_000);
}));

test("empty and corrupt PDFs fail without evidence", () => temp(async path => {
  await writeFile(path, pdf(1, ""));
  await assert.rejects(extractPdfText(path), /sin texto extraíble/);
  await writeFile(path, "broken");
  await assert.rejects(extractPdfText(path), /no se pudo extraer/);
}));

test("parser is killed when its time budget is exhausted", () => temp(async path => {
  await writeFile(path, pdf());
  await assert.rejects(extractPdfText(path, 1), /tiempo máximo/);
}));

test("reject oversized headers and actual streams even with missing/false headers", () => temp(async path => {
  await assert.rejects(readPdfDownload(new Response("a", { headers: { "content-length": "100" } }), path, 10), /mayor de 128 MiB/);
  await assert.rejects(readPdfDownload(new Response("x".repeat(11)), path, 10), /mayor de 128 MiB/);
  await rm(path);
  await assert.rejects(readPdfDownload(new Response("x".repeat(11), { headers: { "content-length": "1" } }), path, 10), /mayor de 128 MiB/);
}));

test("HTTP failure and truncated stream are not accepted", () => temp(async path => {
  await assert.rejects(readPdfDownload(new Response("no", { status: 403 }), path, MAX_PDF_BYTES));
  const response = new Response(new ReadableStream({
    pull(controller) { controller.error(new Error("interrupted")); },
  }));
  await assert.rejects(readPdfDownload(response, path, MAX_PDF_BYTES), /interrupted/);
}));

test("chunked download preserves exact bytes", () => temp(async path => {
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("first"));
      controller.enqueue(new TextEncoder().encode("second"));
      controller.close();
    },
  }));
  await readPdfDownload(response, path, MAX_PDF_BYTES);
  assert.equal(await readFile(path, "utf8"), "firstsecond");
}));

test("large document library keeps excerpt selection bounded and verbatim", () => {
  const sources = Array.from({ length: 80 }, (_, i) => ({
    id: String(i), name: "Drive", url: "https://example.test", text: "access controls ".repeat(10000),
  }));
  const selected = selectSourceExcerpts(sources, "access");
  assert.equal(selected.length, 14);
  for (const source of selected) {
    assert.ok(source.text.length <= 5240);
    for (const part of source.text.split("\n\n[… fragmento separado …]\n\n")) {
      assert.ok(sources[Number(source.id)].text.includes(part));
    }
  }
});
