import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, Trash2, ArrowRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PageHead, LocalNotice, CubeMark } from "@/components/layout";
import { counts, useEvaluations } from "@/lib/store";

export default function Evaluaciones() {
  const { evaluations, error, remove } = useEvaluations();
  const [q, setQ] = useState("");
  const [del, setDel] = useState<string | null>(null);
  const { toast } = useToast();

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return evaluations;
    return evaluations.filter((e) => Object.values(e.analysis.input).join(" ").toLowerCase().includes(s));
  }, [evaluations, q]);

  const confirm = () => {
    if (!del) return;
    const err = remove(del);
    toast(err ? { title: "No se pudo eliminar", description: err, variant: "destructive" } : { title: "Evaluación eliminada" });
    setDel(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <PageHead kicker="Historial local" title="Evaluaciones">
        <LocalNotice error={error} />
      </PageHead>

      {evaluations.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Buscar evaluaciones" placeholder="Buscar por título, amenaza, vulnerabilidad o información" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search" />
        </div>
      )}

      {evaluations.length === 0 ? (
        <div className="grid-paper rise flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <CubeMark className="h-14 w-14 text-muted-foreground" />
          <h2 className="font-display mt-4 text-2xl">Aún no hay evaluaciones</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Cuando generes propuestas para un riesgo, se guardarán aquí, en este navegador, a la espera de tu revisión.</p>
          <Button asChild className="mt-6"><Link href="/" data-testid="link-create-first"><Plus className="h-4 w-4" />Evaluar un riesgo</Link></Button>
        </div>
      ) : list.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground" data-testid="text-no-results">Ninguna evaluación coincide con «{q}».</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-card-border bg-card">
          {list.map((e, i) => {
            const c = counts(e);
            const total = e.analysis.proposals.length;
            return (
              <li key={e.analysis.id} className="rise group flex items-center gap-4 p-4 md:p-5" style={{ animationDelay: `${i * 30}ms` }} data-testid={`row-eval-${e.analysis.id}`}>
                <Link href={`/evaluaciones/${e.analysis.id}`} className="min-w-0 flex-1" data-testid={`link-eval-${e.analysis.id}`}>
                  <div className="truncate font-medium group-hover:text-primary">{e.analysis.input.title}</div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">{e.analysis.input.threat}</div>
                  <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>{new Date(e.analysis.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span className="text-primary">{c.approved} aprobadas</span>
                    <span>{c.pending} pendientes</span>
                    <span className="text-destructive">{c.rejected} rechazadas</span>
                  </div>
                  <div className="mt-2 flex h-1 max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="bg-primary" style={{ width: `${total ? (c.approved / total) * 100 : 0}%` }} />
                    <div className="bg-destructive/70" style={{ width: `${total ? (c.rejected / total) * 100 : 0}%` }} />
                  </div>
                </Link>
                <Button variant="ghost" size="icon" aria-label={`Eliminar ${e.analysis.input.title}`} onClick={() => setDel(e.analysis.id)} data-testid={`button-delete-${e.analysis.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 sm:block" />
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta evaluación?</AlertDialogTitle>
            <AlertDialogDescription>Se borrarán las propuestas y tus decisiones de revisión de este navegador. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
