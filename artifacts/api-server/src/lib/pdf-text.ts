import { fork } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const MAX_PDF_BYTES = 128 * 1024 * 1024;
export const PDF_TIMEOUT_MS = 60_000;
export const PDF_SIZE_ERROR = "PDF mayor de 128 MiB; no se ha procesado.";

export interface PdfExtraction {
  text: string;
  note: string;
  partial: boolean;
  pagesRead: number;
  totalPages: number;
}

// A separate process prevents a malformed PDF from blocking the API event loop.
// V8 heap is capped; input bytes, output and concurrency are separately bounded.
export async function extractPdfText(path: string, timeoutMs = PDF_TIMEOUT_MS): Promise<PdfExtraction> {
  return runChild("./pdf-worker.mjs", [path], {}, timeoutMs);
}

function runChild<T>(worker: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<T> {
  const child = fork(new URL(worker, import.meta.url), args, {
    execArgv: ["--max-old-space-size=192"],
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    // The parser does not need application secrets or connector credentials.
    env,
  });
  return new Promise((resolve, reject) => {
    let result: T | undefined;
    let failure: Error | undefined;
    const timer = setTimeout(() => {
      failure = new Error("PDF: tiempo máximo de extracción agotado; no se utiliza como evidencia.");
      child.kill("SIGKILL");
    }, timeoutMs);
    child.on("message", (message: { result?: T; error?: string }) => {
      if (message.error) failure = new Error(message.error);
      else result = message.result;
    });
    child.on("error", error => { failure = error; });
    child.on("close", code => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0 || !result) reject(new Error("PDF: extracción interrumpida o límite de memoria alcanzado; no se utiliza como evidencia."));
      else resolve(result);
    });
  });
}

// The connector SDK does not accept AbortSignal. Isolate its request so the
// parent can kill even a request stalled before response headers arrive.
export async function downloadDrivePdf(fileId: string): Promise<PdfExtraction> {
  const dir = await mkdtemp(join(tmpdir(), "cubo-pdf-"));
  const path = join(dir, "document.pdf");
  try {
    await runChild("./pdf-download.mjs", [fileId, path, String(MAX_PDF_BYTES)], process.env, PDF_TIMEOUT_MS);
    return await extractPdfText(path);
  } finally { await rm(dir, { recursive: true, force: true }); }
}

