import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriveSync } from "@/hooks/use-drive-sync";
import { useI18n } from "@/lib/i18n";

export function DriveSync() {
  const { data: job, running, start, isError, refetch, mutation } = useDriveSync();
  const { language } = useI18n();
  const en = language === "en";
  return (
    <section className="my-6 rounded-lg border border-border bg-card p-4 text-sm" aria-label={en ? "Drive synchronization" : "Sincronización de Drive"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium">{en ? "Evaluation documents · Google Drive" : "Documentos de la evaluación · Google Drive"}</h3>
        <Button type="button" variant="outline" size="sm" disabled={running || isError || !job} onClick={start} data-testid="button-sync">
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? (en ? "Synchronizing…" : "Sincronizando…") : job?.status === "failed" ? (en ? "Retry synchronization" : "Reintentar sincronización") : (en ? "Synchronize documents" : "Sincronizar documentos")}
        </Button>
      </div>
      <div className="mt-3 space-y-2 text-muted-foreground" role="status" aria-live="polite" data-testid="sync-progress">
        {job?.status === "idle" && <p>{en ? "Synchronize to include Drive documents. Without Drive, the answer uses official NIST and CISA excerpts." : "Sincroniza para incluir documentos de Drive. Sin Drive, la respuesta utiliza fragmentos oficiales de NIST y CISA."}</p>}
        {job?.status === "running" && <>
          <p>{job.phase === "inventory" ? (en ? "Discovering documents (total may increase)" : "Consultando documentos (el total puede aumentar)") : (en ? "Extracting PDFs one at a time" : "Extrayendo PDF uno por uno")}</p>
          <p>{job.processed} / {job.discovered} {en ? "processed" : "procesados"} · {job.errors} {en ? "errors" : "errores"}</p>
          {job.phase === "pdf" && <progress className="w-full" value={job.processed} max={Math.max(1, job.discovered)} aria-label={en ? "Documents processed" : "Documentos procesados"} />}
          {job.currentFile && <p className="break-words">{job.currentFile}</p>}
          <p>{en ? "You can leave this page and return. Restarting the server interrupts this job." : "Puedes salir de esta página y volver. Reiniciar el servidor interrumpe el trabajo."}</p>
        </>}
        {job?.status === "succeeded" && <p>{en ? "Synchronization complete" : "Sincronización completada"} · {job.processed} {en ? "processed" : "procesados"} · {job.errors} {en ? "errors" : "errores"}. {en ? "Only extracted text is used; no OCR." : "Solo se utiliza texto extraído; sin OCR."}</p>}
        {job?.status === "failed" && <p>{en ? "Drive synchronization failed. The last complete inventory was retained. Retry to start a new job." : job.error}</p>}
        {job?.hasInventory && job.status !== "succeeded" && <p>{en ? "Analysis uses the last complete inventory, not the current job's partial results." : "El análisis utiliza el último inventario completo, no los resultados parciales del trabajo actual."}</p>}
        {mutation.isError && <p>{en ? "Could not start synchronization. Try again." : "No se pudo iniciar la sincronización. Inténtalo de nuevo."}</p>}
        {isError && <p>{en ? "Could not check progress. Drive access may be disabled in this environment." : "No se pudo consultar el progreso. El acceso a Drive puede estar desactivado en este entorno."} <button type="button" className="underline" onClick={() => refetch()}>{en ? "Retry" : "Reintentar"}</button></p>}
      </div>
    </section>
  );
}
