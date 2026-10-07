import { useMemo } from "react";
import { Link } from "wouter";
import { ProposalCard } from "@/pages/review";
import { AXES, type Axis } from "@/lib/mccumber";
import { exampleEvaluation } from "@/lib/model-examples";
import { saveEvaluation, useEvaluations, counts } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function ModelExamples({ axis, index }: { axis: Axis; index: number }) {
  const initial = useMemo(() => exampleEvaluation(axis, index), [axis, index]);
  const { evaluations, error } = useEvaluations();
  const { toast } = useToast();
  const ev = evaluations.find((item) => item.analysis.id === initial.analysis.id) ?? initial;
  const tally = counts(ev);
  return (
    <section className="mt-10 space-y-4" aria-labelledby="model-examples-title">
      <div aria-live="polite">
        <div className="font-mono text-xs uppercase text-primary">{AXES[axis].label} · {AXES[axis].items[index].label}</div>
        <h2 id="model-examples-title" className="mt-2 font-display text-3xl">Tres ejemplos para validar</h2>
        <p className="mt-2 text-sm text-muted-foreground">Ejemplos educativos predefinidos con referencias oficiales de apoyo conceptual, no citas de tu Drive ni resultados nuevos de IA. No se atribuye la redacción del ejemplo a la fuente. Puedes aprobar, editar o rechazar cada uno; editarlo requiere volver a aprobarlo. Las evaluaciones guardadas conservan las referencias que tenían al validarse.</p>
        <p className="mt-2 text-sm">{tally.approved} aprobados · {tally.pending} pendientes · {tally.rejected} rechazados</p>
        <p className="mt-1 text-xs text-muted-foreground">Tus decisiones se guardan en este navegador y aparecen en <Link href="/evaluaciones" className="text-primary underline">Evaluaciones</Link>, donde puedes exportar únicamente las aprobadas.</p>
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </div>
      {ev.analysis.proposals.map((p) => (
        <ProposalCard key={p.id} p={p} ev={ev} example onChange={(review) => {
          const failure = saveEvaluation({
            ...ev,
            reviews: { ...ev.reviews, [p.id]: { ...review, updatedAt: new Date().toISOString() } },
          });
          if (failure) toast({ title: "No se pudo guardar", description: failure, variant: "destructive" });
        }} />
      ))}
    </section>
  );
}
