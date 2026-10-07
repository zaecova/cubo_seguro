import { open } from "node:fs/promises";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { pathToFileURL } from "node:url";

// Only the caller's authorized inventory supplies IDs. This worker never lists
// folders, follows shortcuts, exports other formats or writes to Drive.
export async function readPdfDownload(response, path, limit) {
 let reader;
 let file;
 try {
  if (!response.ok) throw new Error("PDF: no se pudo descargar el archivo.");
  if (Number(response.headers.get("content-length")) > Number(limit)) throw new Error("PDF mayor de 128 MiB; no se ha procesado.");
  if (!response.body) throw new Error("PDF: descarga vacía.");
  reader = response.body.getReader();
  file = await open(path, "wx", 0o600);
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > Number(limit)) throw new Error("PDF mayor de 128 MiB; no se ha procesado.");
    await file.writeFile(value);
  }
  const expected = response.headers.get("content-length");
  if (expected !== null && Number(expected) !== size) throw new Error("PDF: descarga incompleta; no se utiliza como evidencia.");
  if (!size) throw new Error("PDF: descarga vacía.");
  return { bytes: size };
 } finally {
  await file?.close();
  if (reader) {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  } else await response.body?.cancel().catch(() => {});
 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [, , id, path, limit] = process.argv;
    const response = await new ReplitConnectors().proxy(
      "google-drive", `/drive/v3/files/${encodeURIComponent(id)}?alt=media`, { method: "GET" },
    );
    process.send({ result: await readPdfDownload(response, path, Number(limit)) });
  } catch (error) {
    process.send({ error: error instanceof Error && /^PDF/.test(error.message)
      ? error.message : "PDF: no se pudo descargar el archivo." });
  } finally { process.disconnect(); }
}
