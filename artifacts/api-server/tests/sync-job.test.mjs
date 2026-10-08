import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";

test("detached sync reuses work, reports progress and preserves the last inventory on failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "drive-sync-"));
  try {
    const result = await build({
      entryPoints: ["src/lib/cyber-sources.ts"], bundle: true, write: false,
      platform: "node", format: "esm",
      plugins: [{
        name: "fake-drive",
        setup(b) {
          b.onResolve({ filter: /^@replit\/connectors-sdk$|^\.\/pdf-text$/ }, args => ({ path: args.path, namespace: "fake" }));
          b.onLoad({ filter: /.*/, namespace: "fake" }, args => ({
            contents: args.path === "./pdf-text"
              ? `export const MAX_PDF_BYTES=1000, PDF_SIZE_ERROR="PDF mayor"; export async function downloadDrivePdf() { await globalThis.pdfGate; return {text:"Texto documental",note:"Texto extraído del PDF",partial:false}; }`
              : `export class ReplitConnectors { async proxy() { globalThis.calls++; if(globalThis.failDrive) throw Error("private error"); return {ok:true,json:async()=>({files:[{id:"pdf1",name:"Documento",mimeType:"application/pdf",size:"10"}]})}; } }`,
          }));
        },
      }],
    });
    const path = join(dir, "sync.mjs");
    await writeFile(path, result.outputFiles[0].text);
    const api = await import(pathToFileURL(path).href);
    globalThis.calls = 0;
    let release;
    globalThis.pdfGate = new Promise(resolve => { release = resolve; });
    assert.equal(api.getSyncStatus().status, "idle");
    assert.equal(api.getCompletedSources(), undefined);
    const first = api.startSync();
    assert.equal(first.status, "running");
    assert.equal(api.startSync().id, first.id);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(globalThis.calls, 1);
    assert.equal(api.getSyncStatus().phase, "pdf");
    assert.equal(api.getSyncStatus().discovered, 1);
    assert.equal(api.getSyncStatus().processed, 0);
    assert.equal(api.getSources().sources.length, 0);
    release();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(api.getSyncStatus().status, "succeeded");
    assert.equal(api.getSyncStatus().processed, 1);
    assert.equal(api.getSyncStatus().hasInventory, true);
    const inventory = api.getCompletedSources();
    globalThis.failDrive = true;
    assert.notEqual(api.startSync().id, first.id);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(api.getSyncStatus().status, "failed");
    assert.equal(api.getCompletedSources(), inventory);
    assert.ok(!api.getSyncStatus().error.includes("private error"));
    globalThis.failDrive = false;
    api.startSync();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(api.getSyncStatus().status, "succeeded");
  } finally {
    delete globalThis.pdfGate;
    delete globalThis.failDrive;
    delete globalThis.calls;
    await rm(dir, { recursive: true, force: true });
  }
});
