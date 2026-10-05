import type { Evaluation } from "./store";
import { finalText } from "./store";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "./mccumber";

function approved(ev: Evaluation) {
  return ev.analysis.proposals.filter((p) => ev.reviews[p.id]?.status === "approved");
}

export function reportJSON(ev: Evaluation) {
  const a = ev.analysis;
  return JSON.stringify(
    {
      informe: "Cubo Seguro — solo propuestas aprobadas por una persona",
      evaluacionId: a.id,
      generadoPorIA: a.createdAt,
      exportado: new Date().toISOString(),
      riesgo: a.input,
      aprobadas: approved(ev).map((p) => {
        const r = ev.reviews[p.id];
        return {
          dimension: DIMENSION_LABEL[p.dimension],
          categoria: p.category,
          textoAprobado: finalText(p, r),
          editadoPorPersona: r?.editedText !== undefined,
          textoOriginalIA: p.text,
          razonamientoIA: p.rationale,
          citas: p.evidence.map((e) => ({ fuente: e.sourceName, url: e.url, citaLiteral: e.quote })),
          baseSinFuente: p.evidence.length === 0 ? "Conocimiento general de IA, sin cita documental" : undefined,
        };
      }),
    },
    null,
    2,
  );
}

export function reportText(ev: Evaluation) {
  const a = ev.analysis;
  const L: string[] = [];
  L.push("CUBO SEGURO — INFORME DE PROPUESTAS APROBADAS", "=".repeat(48), "");
  L.push(`Riesgo: ${a.input.title}`, `Amenaza: ${a.input.threat}`, `Vulnerabilidad: ${a.input.vulnerability}`, `Información: ${a.input.information}`, "");
  L.push("Solo se incluyen propuestas aprobadas explícitamente por una persona. Las pendientes y rechazadas se excluyen.", "");
  const ap = approved(ev);
  if (!ap.length) L.push("(No hay propuestas aprobadas.)");
  DIMENSION_ORDER.forEach((d) => {
    const ps = ap.filter((p) => p.dimension === d);
    if (!ps.length) return;
    L.push(`## ${DIMENSION_LABEL[d].toUpperCase()}`);
    ps.forEach((p) => {
      const r = ev.reviews[p.id];
      L.push(`- [${p.category}] ${finalText(p, r)}${r?.editedText !== undefined ? "  (editado por persona)" : ""}`);
      if (r?.editedText !== undefined) L.push(`    Original IA: ${p.text}`);
      L.push(`    Inferencia IA: ${p.rationale}`);
      if (p.evidence.length === 0) L.push("    Fuente: ninguna — conocimiento general de IA.");
      p.evidence.forEach((e) => L.push(`    Cita «${e.quote}» — ${e.sourceName} ${e.url}`));
    });
    L.push("");
  });
  L.push(`Exportado: ${new Date().toLocaleString("es-ES")}`);
  return L.join("\n");
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
