import { useState } from "react";
import { Link } from "wouter";
import { useAnalyzeRisk, type RiskAnalysis } from "@workspace/api-client-react";
import { ArrowRight, Loader2, Sparkles, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PageHead, LocalNotice, CubeMark } from "@/components/layout";
import { counts, newEvaluation, saveEvaluation, useEvaluations } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { DriveSync } from "@/components/drive-sync";

type RiskForm = { title: string; content: string };
const EMPTY: RiskForm = { title: "", content: "" };
const EXAMPLE = {
  title: "Phishing dirigido al equipo de nóminas",
  threat: "Un atacante envía correos que suplantan al proveedor de nóminas para robar credenciales del portal de RR. HH.",
  vulnerability: "El portal no exige autenticación multifactor y el personal no ha recibido formación reciente sobre suplantación.",
  information: "Datos personales y bancarios de la plantilla almacenados en el portal de nóminas.",
};

const FIELDS: { k: keyof RiskForm; label: string; hint: string; area?: boolean; max: number }[] = [
  { k: "title", label: "Título", hint: "Nombre corto del riesgo", max: 200 },
  { k: "content", label: "Contenido", hint: "Describe la amenaza, la vulnerabilidad y la información afectada en un solo texto.", area: true, max: 9000 },
];

export default function Overview() {
  const { view, t, language } = useI18n();
  const [form, setForm] = useState<RiskForm>(EMPTY);
  const [isExample, setIsExample] = useState(false);
  const { evaluations, error } = useEvaluations();
  const [answer, setAnswer] = useState<RiskAnalysis | null>(() => evaluations.find(e => e.analysis.summary)?.analysis ?? null);
  const { toast } = useToast();
  const analyze = useAnalyzeRisk({ request: { headers: { "Accept-Language": language } } });
  const en = language === "en";
  const reference = answer?.proposals.flatMap(p => p.evidence)[0];

  const valid = form.title.trim().length >= 1 && form.content.trim().length >= 3;
  const pendingTotal = evaluations.reduce((n, e) => n + counts(e).pending, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || analyze.isPending) return;
    setAnswer(null);
    analyze.mutate(
      { data: { title: form.title.trim(), content: form.content.trim() } },
      {
        onSuccess: (analysis) => {
          setAnswer(analysis);
          const err = saveEvaluation(newEvaluation(analysis));
          if (err) {
            toast({ title: t("No se pudo guardar localmente"), description: t(err) + " " + t("La evaluación no persistirá."), variant: "destructive" });
            return;
          }
        },
        onError: () => toast({ title: "El análisis falló", description: "El servidor no pudo completar el análisis. Inténtalo de nuevo.", variant: "destructive" }),
      },
    );
  };

  return view(
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <PageHead kicker="Espacio de trabajo" title={<>La IA propone.<br /><em className="text-primary">Tú firmas.</em></>}>
        <LocalNotice error={error} />
      </PageHead>

      <div className="grid gap-4 sm:grid-cols-2 rise" style={{ animationDelay: "80ms" }}>
        <Link href="/evaluaciones" className="rounded-lg border border-card-border bg-card p-5 transition-transform hover:-translate-y-0.5" data-testid="link-stat-evaluations">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Evaluaciones locales</div>
          <div className="font-display mt-2 text-4xl" data-testid="text-eval-count">{evaluations.length}</div>
        </Link>
        <Link href="/evaluaciones" className="rounded-lg border border-accent/60 bg-accent/15 p-5 transition-transform hover:-translate-y-0.5" data-testid="link-stat-pending">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Propuestas sin decidir</div>
          <div className="font-display mt-2 text-4xl" data-testid="text-pending-count">{pendingTotal}</div>
        </Link>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
        <form onSubmit={submit} className="rise rounded-xl border border-card-border bg-card p-6 md:p-8" style={{ animationDelay: "140ms" }} aria-busy={analyze.isPending}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Nuevo riesgo</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => { setForm({ title: t(EXAMPLE.title), content: [t(EXAMPLE.threat), t(EXAMPLE.vulnerability), t(EXAMPLE.information)].join("\n\n") }); setIsExample(true); }} data-testid="button-fill-example">
              <FlaskConical className="h-4 w-4" /> Rellenar con ejemplo
            </Button>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{en ? "Get one integrated answer using available Drive documents or official NIST and CISA excerpts." : "Obtén una sola respuesta integrada considerando los documentos disponibles de Drive o fragmentos oficiales de NIST y CISA."}</p>
          <details className="mb-4 text-sm">
            <summary className="cursor-pointer">{en ? "Optional: update Drive documents" : "Opcional: actualizar documentos de Drive"}</summary>
            <DriveSync />
          </details>
          {isExample && (
            <div className="mb-5 rounded-md border border-dashed border-accent bg-accent/10 px-3 py-2 text-xs" data-testid="text-example-label">
              <span className="font-mono uppercase tracking-wider">Ejemplo</span> — datos ficticios de demostración. Edítalos o analízalos tal cual.
            </div>
          )}
          <div className="space-y-5">
            {FIELDS.map((f) => (
              <div key={f.k} className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor={f.k}>{f.k === "content" && en ? "Content" : f.label}</Label>
                  <span className="font-mono text-[10px] text-muted-foreground">{form[f.k].length}/{f.max}</span>
                </div>
                {f.area ? (
                  <Textarea id={f.k} rows={7} maxLength={f.max} placeholder={en ? "Describe the threat, vulnerability and affected information in a single text." : f.hint} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} data-testid={`input-${f.k}`} />
                ) : (
                  <Input id={f.k} maxLength={f.max} placeholder={f.hint} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} data-testid={`input-${f.k}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={!valid || analyze.isPending} data-testid="button-analyze">
              {analyze.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />{en ? "Analyzing sources…" : "Analizando con fuentes…"}</> : <><Sparkles className="h-4 w-4" />{en ? "Generate answer" : "Generar respuesta"}</>}
            </Button>
            {(form.title || form.content) && !analyze.isPending && (
              <Button type="button" variant="ghost" onClick={() => { setForm(EMPTY); setIsExample(false); setAnswer(null); }} data-testid="button-clear">Limpiar</Button>
            )}
            <p className="text-xs text-muted-foreground">{en ? "Enter a title and content (at least 3 characters). Include the threat, vulnerability and affected information." : "Escribe un título y contenido (mínimo 3 caracteres). Incluye la amenaza, la vulnerabilidad y la información afectada."}</p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">El análisis considera los documentos leídos de «Gestión de ciberseguridad» y fragmentos oficiales de NIST CSF 2.0 y CISA. Cada cita identifica su origen y enlace. Las referencias externas son un catálogo verificado, no una búsqueda web en tiempo real.</p>
          {answer && <article className="mt-6 space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-5" data-testid="summary-answer" aria-live="polite">
            <h3 className="font-display text-2xl">{en ? "Answer" : "Respuesta"}</h3>
            <p className="text-sm font-medium">{answer.input.title}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer.summary}</p>
            {reference ? <div className="border-t border-border pt-3 text-sm">
              <a className="underline" href={reference.url} target="_blank" rel="noreferrer">{reference.sourceName}</a>
              <blockquote className="mt-2 border-l-2 border-primary pl-3">{reference.quote}</blockquote>
              <p className="mt-2 text-xs text-muted-foreground">{en ? "This quote supports part of the answer, not every recommendation." : "Esta cita respalda parte de la respuesta, no necesariamente todas las recomendaciones."}</p>
            </div> : <p className="text-xs">{en ? "No verified quote: treat this answer as a general AI inference." : "Sin cita verificada: considera esta respuesta una inferencia general de IA."}</p>}
            <p className="text-xs text-muted-foreground">{answer.warning}</p>
            <Link className="inline-block text-sm underline" href={`/evaluaciones/${answer.id}`}>{en ? "Review details and decisions (optional)" : "Revisar detalle y decisiones (opcional)"}</Link>
          </article>}
        </form>

        <aside className="rise space-y-6 text-sm" style={{ animationDelay: "200ms" }}>
          <CubeMark className="h-16 w-16 text-primary" />
          <ol className="space-y-4">
            {[
              ["01", "Describe", en ? "Title and content: describe the threat, vulnerability and affected information together." : "Título y contenido: describe juntos la amenaza, la vulnerabilidad y la información afectada."],
              ["02", en ? "One answer" : "Una respuesta", en ? "An integrated answer based on available Drive text or official sources." : "Una respuesta integrada considerando Drive disponible o fuentes oficiales."],
              ["03", "Distingue", "Cita literal del documento separada de la inferencia del modelo."],
              ["04", "Aprueba", "Nada cuenta hasta que tú lo marcas. Solo lo aprobado se exporta."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex gap-3">
                <span className="shrink-0 font-mono text-xs text-primary">{n}</span>
                <div><div className="font-medium">{t}</div><div className="text-muted-foreground">{d}</div></div>
              </li>
            ))}
          </ol>
          <Link href="/modelo" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline" data-testid="link-model">
            Explorar las 27 celdas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
