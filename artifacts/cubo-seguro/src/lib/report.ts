import type { Evaluation } from "./store";
import { finalText } from "./store";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "./mccumber";
import { translate, type Language } from "./i18n";
import { getReferenceTranslation } from "./external-references";

function approved(ev: Evaluation) {
  return ev.analysis.proposals.filter((p) => ev.reviews[p.id]?.status === "approved");
}

export function reportJSON(ev: Evaluation, language: Language = "es") {
  const a = ev.analysis;
  if (language === "en") return JSON.stringify({
    report: "Cubo Seguro — only proposals approved by a person",
    language, assessmentId: a.id, createdAt: a.createdAt, exportedAt: new Date().toISOString(),
    origin: a.id.startsWith("ejemplos-mccumber-") ? "Predefined educational examples" : "AI-generated proposals",
    scenario: a.input,
    approved: approved(ev).map(p => ({
      dimension: translate(DIMENSION_LABEL[p.dimension], language), category: p.category,
      approvedText: finalText(p, ev.reviews[p.id]), editedByPerson: ev.reviews[p.id]?.editedText !== undefined,
      originalText: p.text, explanation: p.rationale,
      citations: p.evidence.map(e => ({ source: e.sourceName.replace("Consultada", "Accessed").replace("Referencia externa", "External reference"), url: e.url, originalQuote: e.quote })),
      basisWithoutSource: p.evidence.length ? undefined : "No documentary quote; educational example or general AI knowledge",
    })),
  }, null, 2);
  return JSON.stringify(
    {
      informe: "Cubo Seguro — solo propuestas aprobadas por una persona",
      evaluacionId: a.id,
      ...(a.id.startsWith("ejemplos-mccumber-") ? { creado: a.createdAt, origen: "Ejemplo didáctico predefinido" } : { generadoPorIA: a.createdAt }),
      exportado: new Date().toISOString(),
      riesgo: a.input,
      aprobadas: approved(ev).map((p) => {
        const r = ev.reviews[p.id];
        return {
          dimension: DIMENSION_LABEL[p.dimension],
          categoria: p.category,
          textoAprobado: finalText(p, r),
          editadoPorPersona: r?.editedText !== undefined,
          ...(a.id.startsWith("ejemplos-mccumber-") ? { textoOriginalEjemplo: p.text, explicacion: p.rationale } : { textoOriginalIA: p.text, razonamientoIA: p.rationale }),
          citas: p.evidence.map((e) => ({ fuente: e.sourceName, url: e.url, citaLiteral: e.quote, traduccionNoOficialDelFragmentoCompleto: getReferenceTranslation(e) })),
          baseSinFuente: p.evidence.length === 0 ? (a.id.startsWith("ejemplos-mccumber-") ? "Ejemplo didáctico predefinido, sin consulta documental" : "Conocimiento general de IA, sin cita documental") : undefined,
        };
      }),
    },
    null,
    2,
  );
}

export function reportText(ev: Evaluation, language: Language = "es") {
  const l = (es: string, en: string) => language === "es" ? es : en;
  const a = ev.analysis;
  const example = a.id.startsWith("ejemplos-mccumber-");
  const L: string[] = [];
  L.push(l("CUBO SEGURO — INFORME DE PROPUESTAS APROBADAS", "CUBO SEGURO — APPROVED PROPOSALS REPORT"), "=".repeat(48), "");
  L.push(`${l("Riesgo", "Risk")}: ${a.input.title}`, `${l("Amenaza", "Threat")}: ${a.input.threat}`, `${l("Vulnerabilidad", "Vulnerability")}: ${a.input.vulnerability}`, `${l("Información", "Information")}: ${a.input.information}`, "");
  L.push(l("Solo se incluyen propuestas aprobadas explícitamente por una persona. Las pendientes y rechazadas se excluyen.", "Only proposals explicitly approved by a person are included. Pending and rejected proposals are excluded."), "");
  const ap = approved(ev);
  if (!ap.length) L.push(l("(No hay propuestas aprobadas.)", "(No approved proposals.)"));
  DIMENSION_ORDER.forEach((d) => {
    const ps = ap.filter((p) => p.dimension === d);
    if (!ps.length) return;
    L.push(`## ${translate(DIMENSION_LABEL[d], language).toUpperCase()}`);
    ps.forEach((p) => {
      const r = ev.reviews[p.id];
      L.push(`- [${p.category}] ${finalText(p, r)}${r?.editedText !== undefined ? l("  (editado por persona)", "  (edited by a person)") : ""}`);
      if (r?.editedText !== undefined) L.push(`    ${example ? l("Ejemplo original", "Original example") : l("Original IA", "Original AI")}: ${p.text}`);
      L.push(`    ${example ? l("Relación con la capa", "Relationship to the layer") : l("Inferencia IA", "AI inference")}: ${p.rationale}`);
      if (p.evidence.length === 0) L.push(l(example ? "    Fuente: ninguna — ejemplo didáctico predefinido." : "    Fuente: ninguna — conocimiento general de IA.", "    Source: none — educational example or general AI knowledge."));
      p.evidence.forEach((e) => {
        const translation = language === "es" ? getReferenceTranslation(e) : undefined;
        if (translation) L.push(`    Traducción no oficial del fragmento completo: ${translation}`);
        L.push(`    ${l("Cita original", "Original quote")} «${e.quote}» — ${language === "es" ? e.sourceName : e.sourceName.replace("Consultada", "Accessed").replace("Referencia externa", "External reference")} ${e.url}`);
      });
    });
    L.push("");
  });
  L.push(`${l("Exportado", "Exported")}: ${new Date().toLocaleString(language === "es" ? "es-PE" : "en-US")}`);
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
