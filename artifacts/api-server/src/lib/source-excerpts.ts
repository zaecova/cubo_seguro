// Select bounded, verbatim excerpts; never send an entire PDF library to the model.
export function selectSourceExcerpts<T extends { id: string; name: string; text: string; url: string }>(sources: T[], scenario: string) {
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const stop = new Set(["para", "como", "from", "with", "that", "this", "unos", "unas", "esta", "este", "their", "data", "datos"]);
  const terms = new Set(normalize(scenario).match(/[a-z0-9]{4,}/g)?.filter(t => !stop.has(t)) ?? []);
  const groups = [
    ["phishing", "suplantacion", "impersonation", "correo", "email"],
    ["password", "contrasena", "credencial", "credential", "authentication", "autenticacion", "multifactor", "mfa"],
    ["backup", "respaldo", "restauracion", "recovery", "recuperacion"],
    ["access", "acceso", "permission", "permiso", "privilege", "privilegio"],
    ["encryption", "cifrado", "confidentiality", "confidencialidad"],
    ["availability", "disponibilidad", "denial", "denegacion"],
  ];
  for (const group of groups) if (group.some(t => normalize(scenario).includes(t))) group.forEach(t => terms.add(t));
  const score = (text: string) => {
    const normalized = normalize(text);
    return [...terms].reduce((n, t) => n + (normalized.includes(t) ? 1 : 0), 0);
  };
  return sources.map(source => {
    if (source.id.startsWith("external:")) return { source, score: score(source.text), text: source.text };
    const chunks: { text: string; score: number; index: number }[] = [];
    for (let i = 0; i < source.text.length; i += 2200) {
      const text = source.text.slice(i, i + 2600);
      chunks.push({ text, score: score(text), index: i });
    }
    const selected = chunks.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 2);
    return { source, score: (selected[0]?.score ?? 0) + score(source.name), text: selected.sort((a, b) => a.index - b.index).map(c => c.text).join("\n\n[… fragmento separado …]\n\n") };
  }).sort((a, b) => b.score - a.score).slice(0, 14).map(({ source, text }) => ({ ...source, text }));
}
