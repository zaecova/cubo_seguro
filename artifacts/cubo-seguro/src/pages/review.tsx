import { useState } from "react";
import { Link, useParams } from "wouter";
import type { Proposal } from "@workspace/api-client-react";
import { ArrowLeft, Download, ExternalLink, Pencil, Quote, X, Undo2, Brain, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PageHead, LocalNotice } from "@/components/layout";
import { counts, finalText, useEvaluations, type Evaluation, type ProposalReview } from "@/lib/store";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "@/lib/mccumber";
import { download, reportJSON, reportText } from "@/lib/report";

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const { evaluations, error, update } = useEvaluations();
  const { toast } = useToast();
  const ev = evaluations.find((e) => e.analysis.id === id);

  if (!ev) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl">Evaluación no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "No existe en el almacenamiento de este navegador. Puede haberse eliminado o creado en otro dispositivo."}</p>
        <Button asChild className="mt-6"><Link href="/evaluaciones">Volver al historial</Link></Button>
      </div>
    );
  }

  const setReview = (pid: string, r: ProposalReview) => {
    const err = update(ev.analysis.id, (e) => ({ ...e, reviews: { ...e.reviews, [pid]: { ...r, updatedAt: new Date().toISOString() } } }));
    if (err) toast({ title: "Decisión no guardada", description: err, variant: "destructive" });
  };

  const c = counts(ev);
  const a = ev.analysis;
  const slug = a.input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <Link href="/evaluaciones" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="h-4 w-4" />Evaluaciones</Link>
      <PageHead kicker={`Revisión · ${new Date(a.createdAt).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}`} title={a.input.title}>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!c.approved} onClick={() => download(`cubo-seguro-${slug}.txt`, reportText(ev), "text/plain;charset=utf-8")} data-testid="button-export-text"><Download className="h-4 w-4" />Texto</Button>
          <Button variant="outline" disabled={!c.approved} onClick={() => download(`cubo-seguro-${slug}.json`, reportJSON(ev), "application/json")} data-testid="button-export-json"><Download className="h-4 w-4" />JSON</Button>
        </div>
      </PageHead>

      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-card-border bg-card p-5 text-sm">
            {(["threat", "vulnerability", "information"] as const).map((k) => (
              <div key={k} className="mb-4 last:mb-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k === "threat" ? "Amenaza" : k === "vulnerability" ? "Vulnerabilidad" : "Información afectada"}</div>
                <p className="mt-1 leading-relaxed">{a.input[k]}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-sidebar p-5 text-sidebar-foreground" data-testid="panel-tally">
            <div className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/60">Firma humana</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><div className="font-display text-3xl text-sidebar-primary">{c.approved}</div><div className="text-[11px]">aprobadas</div></div>
              <div><div className="font-display text-3xl">{c.pending}</div><div className="text-[11px]">pendientes</div></div>
              <div><div className="font-display text-3xl text-orange-300">{c.rejected}</div><div className="text-[11px]">rechazadas</div></div>
            </div>
            <p className="mt-4 text-xs text-sidebar-foreground/70">La exportación incluye solo las aprobadas. Pendientes y rechazadas nunca aparecen como aprobadas.</p>
          </div>
          {a.warning && (
            <div className="flex gap-2 rounded-md border border-accent bg-accent/10 p-3 text-xs" data-testid="text-analysis-warning"><AlertTriangle className="h-4 w-4 shrink-0" />{a.warning}</div>
          )}
          <LocalNotice error={error} />
        </aside>

        <div className="space-y-10">
          {a.proposals.length === 0 && <p className="text-sm text-muted-foreground">El análisis no devolvió propuestas.</p>}
          {DIMENSION_ORDER.map((d) => {
            const ps = a.proposals.filter((p) => p.dimension === d);
            if (ps.length === 0) return null;
            return (
              <section key={d} aria-labelledby={`h-${d}`}>
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 id={`h-${d}`} className="font-display text-2xl">{DIMENSION_LABEL[d]}</h2>
                  <span className="font-mono text-xs text-muted-foreground">{ps.length}</span>
                </div>
                {ps.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">Sin propuestas para esta dimensión.</p>
                ) : (
                  <div className="space-y-4">{ps.map((p) => <ProposalCard key={p.id} p={p} ev={ev} onChange={(r) => setReview(p.id, r)} />)}</div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ p, ev, onChange }: { p: Proposal; ev: Evaluation; onChange: (r: ProposalReview) => void }) {
  const r = ev.reviews[p.id] ?? { status: "pending" };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(finalText(p, r));
  const edited = r.editedText !== undefined;
  const tone = r.status === "approved" ? "border-primary/60 bg-primary/[0.04]" : r.status === "rejected" ? "border-destructive/30 opacity-70" : "border-card-border bg-card";

  const saveEdit = () => {
    const t = draft.trim();
    if (!t) return;
    onChange({ status: "pending", editedText: t === p.text ? undefined : t });
    setEditing(false);
  };

  return (
    <article className={`relative rounded-xl border p-5 transition-colors ${tone}`} data-testid={`card-proposal-${p.id}`}>
      {r.status !== "pending" && (
        <span className={`pop stamp mb-3 inline-block rounded px-2 py-0.5 font-mono text-[10px] uppercase ${r.status === "approved" ? "text-primary" : "text-destructive"}`} data-testid={`status-proposal-${p.id}`}>
          {r.status === "approved" ? "Aprobada" : "Rechazada"}
        </span>
      )}
      <div className="flex items-start gap-4">
        <Checkbox
          id={`ap-${p.id}`}
          className="mt-1 h-5 w-5 shrink-0"
          checked={r.status === "approved"}
          disabled={editing}
          onCheckedChange={(v) => onChange({ ...r, status: v ? "approved" : "pending" })}
          aria-label="Aprobar propuesta"
          data-testid={`checkbox-approve-${p.id}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <span className="rounded bg-secondary px-1.5 py-0.5">{p.category}</span>
            <span className="text-muted-foreground">Propuesta IA</span>
            {edited && <span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground" data-testid={`text-edited-${p.id}`}>Editada por persona</span>}
          </div>
          {editing ? (
            <div className="mt-3 space-y-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} aria-label="Editar texto" data-testid={`input-edit-${p.id}`} />
              <p className="text-xs text-muted-foreground">Guardar una edición devuelve la propuesta a pendiente; tendrás que aprobarla de nuevo.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={saveEdit} disabled={!draft.trim()} data-testid={`button-save-edit-${p.id}`}>Guardar edición</Button>
                <Button size="sm" variant="ghost" onClick={() => { setDraft(finalText(p, r)); setEditing(false); }}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <label htmlFor={`ap-${p.id}`} className={`mt-2 block cursor-pointer text-[15px] leading-relaxed ${r.status === "rejected" ? "line-through" : ""}`}>{finalText(p, r)}</label>
          )}
          {edited && !editing && (
            <p className="mt-2 border-l-2 border-border pl-3 text-xs text-muted-foreground"><span className="font-mono uppercase">Original IA:</span> {p.text}</p>
          )}

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <div className="rounded-lg border-2 border-blue-300 border-l-[5px] border-l-blue-700 bg-blue-50 p-4 text-sm text-black shadow-sm">
              <div className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-blue-900"><Brain className="h-5 w-5 shrink-0" />Inferencia de la IA</div>
              <p className="leading-relaxed">{p.rationale}</p>
            </div>
            <div className="rounded-lg border-2 border-green-300 border-l-[5px] border-l-green-700 bg-green-50 p-4 text-sm text-black shadow-sm">
              <div className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-green-900"><Quote className="h-5 w-5 shrink-0" />Qué dice la información guardada</div>
              {p.evidence.length === 0 ? (
                <p className="text-black" data-testid={`text-no-evidence-${p.id}`}>No se encontró una cita en los documentos leídos que respalde esta propuesta. Esta afirmación se basa en <strong>conocimiento general de la IA</strong>, no en la información guardada.</p>
              ) : (
                <ul className="space-y-3">
                  {p.evidence.map((e, i) => (
                    <li key={i}>
                      <blockquote className="font-serif italic leading-relaxed">«{e.quote}»</blockquote>
                      <a href={e.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">{e.sourceName}<ExternalLink className="h-3 w-3" /></a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {!editing && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setDraft(finalText(p, r)); setEditing(true); }} data-testid={`button-edit-${p.id}`}><Pencil className="h-3.5 w-3.5" />Editar</Button>
              {r.status === "rejected" ? (
                <Button size="sm" variant="ghost" onClick={() => onChange({ ...r, status: "pending" })} data-testid={`button-unreject-${p.id}`}><Undo2 className="h-3.5 w-3.5" />Deshacer rechazo</Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onChange({ ...r, status: "rejected" })} data-testid={`button-reject-${p.id}`}><X className="h-3.5 w-3.5" />Rechazar</Button>
              )}
              {edited && <Button size="sm" variant="ghost" onClick={() => onChange({ status: "pending" })} data-testid={`button-restore-${p.id}`}>Restaurar original</Button>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
