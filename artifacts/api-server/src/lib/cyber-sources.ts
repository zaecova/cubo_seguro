import { ReplitConnectors } from "@replit/connectors-sdk";
import { GetSourcesResponse } from "@workspace/api-zod";
import type { z } from "zod";

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
  for (const folder of folders) {
    if (visited.has(folder.id)) continue;
    visited.add(folder.id);
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        q: `'${folder.id}' in parents and trashed = false`,
        fields: "nextPageToken,incompleteSearch,files(id,name,mimeType,webViewLink)",
        pageSize: "100", ...(pageToken ? { pageToken } : {}),
      });
      const response = await connector.proxy("google-drive", `/drive/v3/files?${params}`, { method: "GET" });
      if (!response.ok) throw new Error(`Drive devolvió ${response.status}. No se pudo consultar la carpeta.`);
      const data = await response.json() as {
        files: { id: string; name: string; mimeType: string; webViewLink?: string }[];
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
          url: file.webViewLink || "", status: "pending", text: "",
          note: file.mimeType === "application/pdf"
            ? "PDF pendiente de extracción. No se utiliza como evidencia en el análisis."
            : "Formato pendiente de procesamiento. No se utiliza como evidencia en el análisis.",
        };
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
  return GetSourcesResponse.parse({
    sources: sources.sort((a, b) => a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name, "es", { numeric: true })),
    syncedAt: new Date().toISOString(),
    warning: `Se revisaron ${visited.size - 1} carpetas dentro de Gestión de ciberseguridad. Cobertura parcial: solo los documentos marcados como leídos respaldan el análisis. Los archivos pendientes no han sido interpretados. Las inferencias de IA requieren revisión humana.`,
  });
}

export async function getSources(force = false): Promise<Inventory> {
  if (!force && cache && Date.now() - Date.parse(cache.syncedAt) < 300_000) return cache;
  if (!inFlight) inFlight = load().then(value => { cache = value; return value; }).finally(() => { inFlight = undefined; });
  return inFlight;
}