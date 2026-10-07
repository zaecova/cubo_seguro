import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSourcesQueryKey, useGetSources, useSyncSources, type Source } from "@workspace/api-client-react";
import { RefreshCw, ExternalLink, AlertTriangle, FileText, Clock, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageHead } from "@/components/layout";

const STATUS: Record<Source["status"], { label: string; cls: string }> = {
  read: { label: "Leído", cls: "bg-primary/10 text-primary" },
  partial: { label: "Lectura parcial", cls: "bg-accent/25 text-foreground" },
  pending: { label: "Pendiente", cls: "bg-accent/25 text-foreground" },
  error: { label: "Error", cls: "bg-destructive/10 text-destructive" },
};

export default function Fuentes() {
  const q = useGetSources();
  const sync = useSyncSources();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sel, setSel] = useState<string | null>(null);

  const doSync = () =>
    sync.mutate(undefined, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetSourcesQueryKey() }); toast({ title: "Drive sincronizado" }); },
      onError: () => toast({ title: "No se pudo sincronizar", description: "El servidor rechazó la sincronización con Drive.", variant: "destructive" }),
    });

  const sources = q.data?.sources ?? [];
  const read = sources.filter((s) => s.status === "read").length;
  const current = sources.find((s) => s.id === sel) ?? null;
  const folders = Array.from(new Set(sources.map((s) => s.folder)));

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <PageHead kicker="Google Drive" title="Fuentes">
        <Button onClick={doSync} disabled={sync.isPending} data-testid="button-sync">
          <RefreshCw className={`h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />{sync.isPending ? "Sincronizando…" : "Sincronizar"}
        </Button>
      </PageHead>

      {q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : q.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <CircleAlert className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="font-display mt-3 text-2xl">No se pudo cargar el inventario</h2>
          <p className="mt-1 text-sm text-muted-foreground">El servidor puede tener desactivado el acceso a Drive en este entorno.</p>
          <Button variant="outline" className="mt-4" onClick={() => q.refetch()} data-testid="button-retry">Reintentar</Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div data-testid="text-coverage"><span className="font-display text-3xl">{read}</span><span className="text-muted-foreground"> de {sources.length} documentos leídos</span></div>
            <div className="flex h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="bg-primary transition-all" style={{ width: `${sources.length ? (read / sources.length) * 100 : 0}%` }} />
            </div>
            {q.data?.syncedAt && <div className="font-mono text-xs text-muted-foreground">Sincronizado {new Date(q.data.syncedAt).toLocaleString("es-ES")}</div>}
          </div>
          {q.data?.warning && (
            <div className="mb-6 flex gap-2 rounded-md border border-accent bg-accent/10 p-3 text-sm" data-testid="text-source-warning"><AlertTriangle className="h-4 w-4 shrink-0" />{q.data.warning}</div>
          )}
          {sources.length === 0 ? (
            <div className="grid-paper rounded-xl border border-dashed border-border px-6 py-14 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="font-display mt-3 text-2xl">Sin documentos</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sincroniza para traer el inventario de la carpeta de Drive.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-6">
                {folders.map((f) => (
                  <div key={f}>
                    <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{f || "Raíz"}</div>
                    <ul className="divide-y divide-border rounded-xl border border-card-border bg-card">
                      {sources.filter((s) => s.folder === f).map((s) => (
                        <li key={s.id}>
                          <button onClick={() => setSel(s.id)} aria-pressed={sel === s.id} className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${sel === s.id ? "bg-muted" : ""}`} data-testid={`button-source-${s.id}`}>
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="whitespace-normal text-sm font-medium">{s.name}</div>
                              {s.note && <div className="whitespace-normal text-xs text-muted-foreground">{s.note}</div>}
                            </div>
                            <span className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase ${STATUS[s.status].cls}`}>{STATUS[s.status].label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="lg:sticky lg:top-6 lg:self-start">
                {!current ? (
                  <div className="grid-paper flex h-64 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Selecciona un documento para ver el texto exacto que la IA puede citar.</div>
                ) : (
                  <div className="rise rounded-xl border border-card-border bg-card" data-testid="panel-source">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
                      <div className="min-w-0">
                        <h2 className="font-display text-xl">{current.name}</h2>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{current.folder}</div>
                      </div>
                      <a href={current.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline" data-testid="link-open-drive">Abrir en Drive<ExternalLink className="h-3 w-3" /></a>
                    </div>
                    <div className="p-5">
                      {current.status === "read" || current.status === "partial" ? (
                        <>
                          <p className="mb-3 text-sm text-muted-foreground">{current.note}</p>
                          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">Texto extraído</div>
                          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap font-serif text-sm leading-relaxed" data-testid="text-source-content">{current.text || "(Documento leído sin texto.)"}</pre>
                        </>
                      ) : (
                        <div className="flex gap-3 text-sm">
                          {current.status === "pending" ? <Clock className="h-5 w-5 shrink-0 text-muted-foreground" /> : <CircleAlert className="h-5 w-5 shrink-0 text-destructive" />}
                          <div>
                            <p className="font-medium">{current.status === "pending" ? "Este documento no se ha leído." : "La lectura falló."}</p>
                            <p className="mt-1 text-muted-foreground">{current.note || "Su contenido no se usa como evidencia."} La IA no puede citarlo.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
