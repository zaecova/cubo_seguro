import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/layout";
import { AXES, type Axis } from "@/lib/mccumber";
import { ModelExamples } from "@/components/model-examples";

type Sel = Record<Axis, number>;
const AX: Axis[] = ["principle", "state", "countermeasure"];

export default function Modelo() {
  const [sel, setSel] = useState<Sel>({ principle: 0, state: 0, countermeasure: 0 });
  const [rot, setRot] = useState({ x: -24, y: 36 });
  const [activeAxis, setActiveAxis] = useState<Axis>("principle");
  const p = AXES.principle.items[sel.principle];
  const s = AXES.state.items[sel.state];
  const c = AXES.countermeasure.items[sel.countermeasure];
  const n = sel.principle * 9 + sel.state * 3 + sel.countermeasure + 1;
  const S = 64;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <PageHead kicker="Marco conceptual" title={<>El cubo de <em className="text-primary">McCumber</em></>}>
        <p className="max-w-sm text-sm text-muted-foreground">Selecciona una dimensión y una capa para ver tres ejemplos y validar cada uno.</p>
      </PageHead>
      <div className="mb-6 flex flex-wrap gap-3" aria-label="Dimensión para los ejemplos">
        {AX.map((axis) => (
          <Button key={axis} variant={activeAxis === axis ? "default" : "outline"} aria-pressed={activeAxis === axis} onClick={() => setActiveAxis(axis)} data-testid={`button-dimension-${axis}`}>
            {axis === "principle" ? "Principios" : axis === "state" ? "Estados de la información" : "Contramedidas"}
          </Button>
        ))}
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="grid-paper relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border" style={{ perspective: 900 }}>
          <div className="relative transition-transform duration-500" style={{ width: S * 3, height: S * 3, transformStyle: "preserve-3d", transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }} aria-hidden>
            {Array.from({ length: 27 }, (_, i) => {
              const pi = Math.floor(i / 9), si = Math.floor(i / 3) % 3, ci = i % 3;
              const on = pi === sel.principle && si === sel.state && ci === sel.countermeasure;
              const inPlane = pi === sel.principle || si === sel.state || ci === sel.countermeasure;
              return (
                <div key={i} className="absolute" style={{ width: S, height: S, transformStyle: "preserve-3d", transform: `translate3d(${ci * S}px, ${si * S}px, ${(1 - pi) * S}px) scale(${on ? 0.96 : 0.86})`, transition: "transform .3s" }}>
                  {[
                    `translateZ(${S / 2}px)`, `rotateY(180deg) translateZ(${S / 2}px)`, `rotateY(90deg) translateZ(${S / 2}px)`,
                    `rotateY(-90deg) translateZ(${S / 2}px)`, `rotateX(90deg) translateZ(${S / 2}px)`, `rotateX(-90deg) translateZ(${S / 2}px)`,
                  ].map((t, f) => (
                    <div key={f} className="absolute inset-0 border" style={{
                      transform: t,
                      background: on ? "hsl(var(--accent))" : inPlane ? "hsl(var(--primary) / .22)" : "hsl(var(--card) / .35)",
                      borderColor: on ? "hsl(var(--foreground))" : "hsl(var(--primary) / .35)",
                    }} />
                  ))}
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {[["Izq", 0, -30], ["Der", 0, 30], ["Arriba", 20, 0], ["Abajo", -20, 0]].map(([l, dx, dy]) => (
                <Button key={l as string} size="sm" variant="secondary" onClick={() => setRot((r) => ({ x: r.x + (dx as number), y: r.y + (dy as number) }))} data-testid={`button-rotate-${l}`}>{l}</Button>
              ))}
            </div>
            <Button size="icon" variant="ghost" aria-label="Restablecer rotación" onClick={() => setRot({ x: -24, y: 36 })} data-testid="button-rotate-reset"><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="space-y-7">
          {AX.map((a) => (
            <fieldset key={a}>
              <legend className="mb-1 font-mono text-[11px] uppercase tracking-widest text-primary">{AXES[a].label}</legend>
              <p className="mb-2 text-sm text-muted-foreground">{AXES[a].question}</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {AXES[a].items.map((it, i) => (
                  <button key={it.key} role="radio" aria-checked={sel[a] === i} onClick={() => { setSel({ ...sel, [a]: i }); setActiveAxis(a); }}
                    className={`rounded-md border px-2 py-2.5 text-sm transition-all active:scale-95 ${sel[a] === i ? "border-foreground bg-accent text-accent-foreground" : "border-border bg-card hover:border-primary"}`}
                    data-testid={`button-axis-${a}-${it.key}`}>
                    {it.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <div key={n} className="rise rounded-xl bg-sidebar p-6 text-sidebar-foreground" aria-live="polite" data-testid="panel-cell">
            <div className="font-mono text-[11px] uppercase tracking-widest text-sidebar-primary">Celda {n} de 27</div>
            <h2 className="font-display mt-2 text-2xl">{p.label} · {s.label} · {c.label}</h2>
            <p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/80">
              Proteger la <strong>{p.label.toLowerCase()}</strong> de la información mientras está en <strong>{s.label.toLowerCase()}</strong>, mediante salvaguardas de <strong>{c.label.toLowerCase()}</strong>.
            </p>
            <dl className="mt-4 space-y-2 text-xs text-sidebar-foreground/70">
              <div><dt className="inline font-mono uppercase">{p.label}:</dt> <dd className="inline">{p.desc}</dd></div>
              <div><dt className="inline font-mono uppercase">{s.label}:</dt> <dd className="inline">{s.desc}</dd></div>
              <div><dt className="inline font-mono uppercase">{c.label}:</dt> <dd className="inline">{c.desc}</dd></div>
            </dl>
          </div>
          <p className="text-xs text-muted-foreground">El cubo conserva las 27 combinaciones. Los ejemplos de abajo corresponden a la última dimensión y capa seleccionadas, no a una evaluación completa de la combinación.</p>
        </div>
      </div>
      <ModelExamples axis={activeAxis} index={sel[activeAxis]} />
    </div>
  );
}
