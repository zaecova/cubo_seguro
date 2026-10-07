import { getDocumentProxy } from "unpdf";

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 200;
const MAX_TEXT = 160_000;

export async function extractPdfText(bytes: Uint8Array) {
  if (bytes.length > MAX_PDF_BYTES) throw new Error("PDF mayor de 20 MB; no se ha procesado.");
  const pdf = await getDocumentProxy(bytes, { verbosity: 0 });
  try {
    const chunks: string[] = [];
    let characters = 0;
    let pagesRead = 0;
    let emptyPages = 0;
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PAGES); pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const text = content.items.map(item => "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "").join("").trim();
        if (!text) emptyPages++;
        if (text) {
          const remaining = MAX_TEXT - characters;
          chunks.push(`[Página ${pageNumber}]\n${text.slice(0, remaining)}`);
          characters += text.length;
        }
        pagesRead = pageNumber;
        if (characters >= MAX_TEXT) break;
      } finally { page.cleanup(); }
    }
    const text = chunks.join("\n\n");
    if (!text.trim()) throw new Error("PDF sin texto extraíble. Puede ser un escaneo; requiere OCR y no se utiliza como evidencia.");
    const partial = pagesRead < pdf.numPages || characters > MAX_TEXT;
    return {
      text,
      note: `Texto extraído del PDF (${pagesRead}/${pdf.numPages} páginas procesadas). ${partial ? "Extracción parcial por límite de 200 páginas o 160.000 caracteres. " : ""}${emptyPages ? `${emptyPages} páginas sin texto extraíble. ` : ""}No se interpretan imágenes ni gráficos; no se ha aplicado OCR. Las citas se verifican contra el texto extraído.`,
    };
  } finally { await pdf.loadingTask.destroy(); }
}

export async function readPdfDownload(response: Response): Promise<Uint8Array> {
  if (!response.ok) throw new Error(`No se pudo descargar el PDF (HTTP ${response.status}).`);
  if (Number(response.headers.get("content-length")) > MAX_PDF_BYTES) {
    await response.body?.cancel();
    throw new Error("PDF mayor de 20 MB; no se ha procesado.");
  }
  if (!response.body) throw new Error("Descarga del PDF vacía.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PDF_BYTES) {
        await reader.cancel();
        throw new Error("PDF mayor de 20 MB; no se ha procesado.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Uint8Array(Buffer.concat(chunks, size));
}
