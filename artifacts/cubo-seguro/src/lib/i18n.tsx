import { createContext, useContext, useEffect, useState, cloneElement, isValidElement, type ReactNode, type ReactElement } from "react";
import { EN } from "./translations";

export type Language = "es" | "en";
const KEY = "cubo-seguro:language";
const LanguageContext = createContext<{ language: Language; setLanguage: (value: Language) => void }>({ language: "es", setLanguage: () => {} });

export function translate(text: string, language: Language): string {
  if (language === "es") return text;
  const trimmed = text.trim();
  let translated = EN[trimmed];
  if (!translated) {
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (EN[capitalized]) translated = EN[capitalized].toLowerCase();
  }
  if (!translated && trimmed.includes(" · ")) translated = trimmed.split(" · ").map(s => translate(s, language)).join(" · ");
  if (!translated && /^Ejemplo \d+$/.test(trimmed)) translated = trimmed.replace("Ejemplo", "Example");
  if (!translated && trimmed.startsWith("Eliminar ")) translated = `Delete ${trimmed.slice(9)}`;
  return translated ? text.replace(trimmed, translated) : text;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem(KEY) === "en" ? "en" : "es"; } catch { return "es"; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "es" ? "Cubo Seguro — Evaluación de riesgos" : "Cubo Seguro — Risk assessment";
    try { localStorage.setItem(KEY, language); } catch { /* Selection still works for this session. */ }
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

// Pure React rendering helper for this app's known copy, never a DOM mutation.
// Only children and explicit display props are visited, not values, IDs, routes,
// event handlers or form state. translate="no" protects user and generated content.
function localize(node: ReactNode, language: Language): ReactNode {
  if (typeof node === "string") return translate(node, language);
  if (Array.isArray(node)) return node.map((child, index) => {
    const translated = localize(child, language);
    return isValidElement(translated) && translated.key === null ? cloneElement(translated, { key: index }) : translated;
  });
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  if (element.props.translate === "no") return node;
  const props: Record<string, unknown> = {};
  for (const key of ["children", "title", "kicker", "description", "placeholder", "aria-label"]) {
    if (element.props[key] !== undefined) props[key] = localize(element.props[key] as ReactNode, language);
  }
  return cloneElement(element, props);
}

export function useI18n() {
  const { language, setLanguage } = useContext(LanguageContext);
  return { language, setLanguage, locale: language === "es" ? "es-PE" : "en-US",
    t: (text: string) => translate(text, language),
    view: (node: ReactNode) => localize(node, language),
  };
}

export function LanguageSelector() {
  const { language, setLanguage } = useI18n();
  return <label className="block text-xs text-sidebar-foreground">
    <span className="mb-2 block">{language === "es" ? "Idioma" : "Language"}</span>
    <select aria-label={language === "es" ? "Idioma" : "Language"} data-testid="select-language" value={language} onChange={e => setLanguage(e.target.value as Language)} className="w-full rounded-md border border-sidebar-border bg-sidebar px-3 py-2 text-sidebar-foreground">
      <option value="es">Español</option><option value="en">English</option>
    </select>
  </label>;
}
