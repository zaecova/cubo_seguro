import { ReplitConnectors } from "@replit/connectors-sdk";
import { GetSourcesResponse } from "@workspace/api-zod";
import type { z } from "zod";
import { downloadDrivePdf, MAX_PDF_BYTES, PDF_SIZE_ERROR } from "./pdf-text";

type Inventory = z.infer<typeof GetSourcesResponse>;
const rootFolder = { id: "1rXkfXrQTjHm-u8f9ilHTVV6nZlo5VchJ", name: "Gestión de ciberseguridad" };
let cache: Inventory | undefined;
let inFlight: Promise<Inventory> | undefined;

async function load(): Promise<Inventory> {
  const connector = new ReplitConnectors();
  const sources: Inventory["sources"] = [];
  const folders = [{ ...rootFolder }];
  const visited = new Set<string>();
  const seenFiles = new Set<string>();
  const pdfJobs: (() => Promise<void>)[] = [];
  for (const folder of folders) {
    if (visited.has(folder.id)) continue;
    visited.add(folder.id);
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        q: `'${folder.id}' in parents and trashed = false`,
        fields: "nextPageToken,incompleteSearch,files(id,name,mimeType,webViewLink,size)",
        pageSize: "100", ...(pageToken ? { pageToken } : {}),
      });
      const response = await connector.proxy("google-drive", `/drive/v3/files?${params}`, { method: "GET" });
      if (!response.ok) throw new Error(`Drive devolvió ${response.status}. No se pudo consultar la carpeta.`);
      const data = await response.json() as {
        files: { id: string; name: string; mimeType: string; webViewLink?: string; size?: string }[];
        nextPageToken?: string; incompleteSearch?: boolean;
      };
      if (data.incompleteSearch) throw new Error("Drive devolvió un inventario incompleto. Intenta sincronizar nuevamente.");
      for (const file of data.files) {
        if (file.mimeType === "application/vnd.google-apps.folder") {
          folders.push({
            id: file.id,
            name: folder.id === rootFolder.id ? file.name.trim() : `${folder.name} / ${file.name.trim()}`,
          });
          continue;
        }
        if (seenFiles.has(file.id)) continue;
        seenFiles.add(file.id);
        const source: Inventory["sources"][number] = {
          id: file.id, name: file.name, folder: folder.name,
          url: file.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`, status: "pending", text: "",
          note: file.mimeType === "application/pdf"
            ? "PDF pendiente de extracción. No se utiliza como evidencia en el análisis."
            : "Formato pendiente de procesamiento. No se utiliza como evidencia en el análisis.",
        };
        if (file.mimeType === "application/pdf") {
          pdfJobs.push(async () => {
            try {
              if (Number(file.size) > MAX_PDF_BYTES) throw new Error(PDF_SIZE_ERROR);
              const extracted = await downloadDrivePdf(file.id);
              source.text = extracted.text;
              source.note = extracted.note;
              source.status = extracted.partial ? "partial" : "read";
            } catch (error) {
              source.status = "error";
              source.text = "";
              source.note = error instanceof Error && /PDF mayor|sin texto extraíble|^PDF:/.test(error.message)
                ? error.message
                : "No se pudo extraer el PDF: puede estar protegido, dañado o no disponible. No se utiliza como evidencia; vuelve a sincronizar.";
            }
          });
        }
        if (["application/vnd.google-apps.document", "application/vnd.google-apps.presentation"].includes(file.mimeType)) {
          try {
            const exported = await connector.proxy("google-drive", `/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text%2Fplain`, { method: "GET" });
            if (!exported.ok) throw new Error(`Error de exportación (${exported.status}).`);
            source.text = await exported.text();
            if (!source.text.trim()) throw new Error("El documento no contiene texto extraíble.");
            source.status = "read";
            source.note = "Texto consultado directamente en Drive. Las citas del análisis se verifican contra este texto.";
            if (file.id === "176QUVf-BWIrYP56Sm3lVwUVhB_6lnPclkwavA64tL_4")
              source.note += " Atención: el archivo se denomina módulo 8, pero su contenido indica módulo 7.";
          } catch {
            source.status = "error";
            source.note = "No se pudo leer este documento. No se utiliza como evidencia; vuelve a sincronizar.";
          }
        }
        sources.push(source);
      }
      pageToken = data.nextPageToken || "";
    } while (pageToken);
  }
  // Bound parallel downloads and parsing to avoid exhausting memory.
  let nextJob = 0;
  await Promise.all(Array.from({ length: Math.min(1, pdfJobs.length) }, async () => {
    while (nextJob < pdfJobs.length) await pdfJobs[nextJob++]();
  }));
  const readCount = sources.filter(s => s.status === "read").length;
  const partialCount = sources.filter(s => s.status === "partial").length;
  const pdfReadCount = sources.filter(s => (s.status === "read" || s.status === "partial") && s.note.startsWith("Texto extraído del PDF")).length;
  return GetSourcesResponse.parse({
    sources: sources.sort((a, b) => a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name, "es", { numeric: true })),
    syncedAt: new Date().toISOString(),
    warning: `Se revisaron ${visited.size - 1} carpetas dentro de Gestión de ciberseguridad. ${readCount}/${sources.length} documentos con texto leído sin recorte; ${partialCount} con extracción parcial. ${pdfReadCount} PDF con texto disponible. No se interpretan imágenes ni se aplica OCR. Solo el texto extraído respalda el análisis; archivos pendientes o con error quedan excluidos. Las inferencias de IA requieren revisión humana.`,
  });
}

export async function getSources(force = false): Promise<Inventory> {
  if (!force && cache && Date.now() - Date.parse(cache.syncedAt) < 300_000) return cache;
  if (!inFlight) inFlight = load().then(value => { cache = value; return value; }).finally(() => { inFlight = undefined; });
  return inFlight;
}