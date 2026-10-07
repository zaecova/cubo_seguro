import catalog from "../../../api-server/src/lib/trusted-references.json";
import type { Axis } from "./mccumber";

// These are conceptual references, not claims that NIST authored the examples.
const MATCHES: Record<Axis, string[][]> = {
  principle: [
    ["PR.AA-05", "PR.DS-01", "PR.DS-02"],
    ["PR.PS-04", "ID.RA-09", "PR.DS-10"],
    ["PR.DS-11", "PR.IR-03", "PR.IR-04"],
  ],
  state: [
    ["PR.DS-01", "PR.AA-05", "PR.DS-11"],
    ["PR.DS-02", "PR.DS-02", "PR.DS-02"],
    ["PR.DS-10", "PR.DS-10", "PR.AA-05"],
  ],
  countermeasure: [
    ["mfa", "PR.IR-01", "PR.PS-04"],
    ["PR.AA-05", "GV.PO-01", "ID.IM-04"],
    ["PR.AT-01", "PR.AT-01", "PR.AT-01"],
  ],
};

export function exampleReference(axis: Axis, layer: number, example: number) {
  const key = MATCHES[axis][layer][example];
  const source = catalog.find(s => s.id.endsWith(`:${key}`));
  if (!source) throw new Error(`Falta referencia oficial: ${key}`);
  return {
    sourceId: source.id,
    sourceName: `${source.name} · Consultada ${source.checkedAt}`,
    url: source.url,
    quote: source.text,
  };
}
