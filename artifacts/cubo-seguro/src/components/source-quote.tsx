import type { Proposal } from "@workspace/api-client-react";
import { ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SOURCE_ES } from "@/lib/source-translations";
import { getReferenceTranslation } from "@/lib/external-references";

export function SourceQuote({ evidence: e }: { evidence: Proposal["evidence"][number] }) {
  const { language } = useI18n();
  const external = e.sourceId.startsWith("external:");
  const translated = language === "es" ? getReferenceTranslation(e) : undefined;
  const name = language === "en" ? e.sourceName.replace("Referencia externa", "External reference").replace("Consultada", "Accessed") : e.sourceName;
  return <div translate="no">
    <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide">
      {external ? (language === "es" ? "Referencia oficial externa" : "Official external reference") : (language === "es" ? "Documento de tu carpeta · Google Drive" : "Document from your folder · Google Drive")}
    </div>
    {translated ? <>
      <p className="mb-1 text-xs">Traducción al español del fragmento de referencia completo · no oficial</p>
      <p lang="es" className="font-serif leading-relaxed">{SOURCE_ES[e.sourceId]}</p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-primary">Ver cita original en inglés</summary>
        <blockquote lang="en" className="mt-2 font-serif italic leading-relaxed">«{e.quote}»</blockquote>
      </details>
    </> : <>
      <p className="mb-1 text-xs">{language === "es" ? "Cita original · sin traducción" : "Original quote · unchanged"}</p>
      <blockquote lang={external ? "en" : undefined} className="font-serif italic leading-relaxed">«{e.quote}»</blockquote>
    </>}
    <a href={e.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">{name}<ExternalLink className="h-3 w-3 shrink-0" /></a>
  </div>;
}
