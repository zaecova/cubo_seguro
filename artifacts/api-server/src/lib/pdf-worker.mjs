import { readFile } from "node:fs/promises";
import { getDocumentProxy } from "unpdf";

const MAX_PAGES = 200;
const MAX_TEXT = 160_000;

async function extract(path) {
  const buffer = await readFile(path);
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(bytes, { verbosity: 0 });
  try {
    const chunks = [];
    let pagesRead = 0;
    let emptyPages = 0;
    let truncated = false;
    let length = 0;
    for (let number = 1; number <= Math.min(pdf.numPages, MAX_PAGES); number++) {
      const page = await pdf.getPage(number);
      try {
        const content = await page.getTextContent();
        const text = content.items.map(item => "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "").join("").trim();
        if (!text) emptyPages++;
        else {
          const chunk = `${chunks.length ? "\n\n" : ""}[Página ${number}]\n${text}`;
          const remaining = MAX_TEXT - length;
          chunks.push(chunk.slice(0, remaining));
          length += Math.min(remaining, chunk.length);
          truncated ||= chunk.length > remaining;
        }
        pagesRead = number;
        if (length >= MAX_TEXT) break;
      } finally { page.cleanup(); }
    }
    const text = chunks.join("");
    if (!text.trim()) throw new Error("PDF sin texto extraíble. Puede ser un escaneo; requiere OCR y no se utiliza como evidencia.");
    const partial = truncated || pagesRead < pdf.numPages || emptyPages > 0;
    return {
      text, partial, pagesRead, totalPages: pdf.numPages,
      note: `Texto extraído del PDF (${pagesRead}/${pdf.numPages} páginas procesadas). ${partial ? "Extracción parcial: límite de 200 páginas / 160.000 caracteres o páginas sin texto extraíble. " : ""}${emptyPages ? `${emptyPages} páginas sin texto extraíble. ` : ""}No se interpretan imágenes ni gráficos; no se ha aplicado OCR. Las citas se verifican contra el texto extraído.`,
    };
  } finally { await pdf.loadingTask.destroy(); }
}

try {
  const result = await extract(process.argv[2]);
  await new Promise((resolve, reject) => process.send({ result }, error => error ? reject(error) : resolve()));
} catch (error) {
  const message = error instanceof Error && /sin texto extraíble/.test(error.message)
    ? error.message : "PDF: no se pudo extraer el texto; puede estar protegido o dañado. No se utiliza como evidencia.";
  await new Promise((resolve, reject) => process.send({ error: message }, err => err ? reject(err) : resolve()));
} finally { process.disconnect(); }
