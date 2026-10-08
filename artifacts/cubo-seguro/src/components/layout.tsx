import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { Boxes, History, Menu, ShieldCheck, X, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LanguageSelector, useI18n } from "@/lib/i18n";

const NAV = [
  { href: "/modelo", label: "Modelo McCumber", icon: Boxes },
  { href: "/evaluaciones", label: "Evaluaciones", icon: History },
];

export function CubeMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 3 36 12v16L20 37 4 28V12Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 12l16 9 16-9M20 21v16" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 3 36 12 20 21 4 12Z" fill="hsl(var(--accent))" opacity=".9" />
    </svg>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { view } = useI18n();
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const health = useHealthCheck();
  const online = health.data?.status === "ok" || (!!health.data && !health.isError);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Principal">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? loc === "/" : loc.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            data-testid={`link-nav-${href.replace("/", "") || "inicio"}`}
            className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
            }`}
          >
            <Icon className={`h-4 w-4 transition-transform group-hover:-translate-y-px ${active ? "text-sidebar-primary" : ""}`} />
            {label}
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
          </Link>
        );
      })}
    </nav>
  );

  const side = (
    <div className="flex h-full flex-col gap-8 p-5">
      <Link href="/" className="flex items-center gap-3 text-sidebar-foreground" data-testid="link-logo">
        <CubeMark className="h-9 w-9" />
        <div>
          <div className="font-display text-xl leading-none">Cubo Seguro</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/50">evidencia · juicio · firma</div>
        </div>
      </Link>
      {nav}
      <div className="mt-auto space-y-3">
        <LanguageSelector />
        <button
          onClick={() => setHelp(true)}
          data-testid="button-help"
          className="flex w-full items-center gap-2 rounded-md border border-sidebar-border px-3 py-2 text-left text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <Info className="h-3.5 w-3.5 text-sidebar-primary" /> Acceso y privacidad
        </button>
        <div className="flex items-center gap-2 font-mono text-[11px] text-sidebar-foreground/60" data-testid="status-api">
          <span className={`h-2 w-2 rounded-full ${health.isLoading ? "bg-sidebar-foreground/40" : online ? "bg-green-400" : "bg-orange-400"}`} />
          {health.isLoading ? "Comprobando servidor" : online ? "Servidor disponible" : "Servidor sin respuesta"}
        </div>
      </div>
    </div>
  );

  return view(
    <div className="min-h-[100dvh] md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden bg-sidebar md:block md:sticky md:top-0 md:h-[100dvh]">{side}</aside>
      <header className="flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <Link href="/" className="flex items-center gap-2"><CubeMark className="h-7 w-7" /><span className="font-display text-lg">Cubo Seguro</span></Link>
        <button aria-label={open ? "Cerrar menú" : "Abrir menú"} onClick={() => setOpen(!open)} data-testid="button-menu">
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && <div className="bg-sidebar md:hidden">{side}</div>}
      <main className="min-w-0">{children}</main>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Acceso y privacidad</DialogTitle>
            <DialogDescription>Estado actual del prototipo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>Cubo Seguro es un <strong>prototipo privado de desarrollo</strong>. No hay inicio de sesión todavía.</p>
            <p>Mientras no se configure un control de acceso, el servidor <strong>desactiva en producción</strong> los endpoints que leen Google Drive privado y llaman a la IA. Si algo no responde en una versión publicada, es intencionado.</p>
            <p>Las evaluaciones y tus decisiones de revisión se guardan <strong>solo en este navegador</strong> (localStorage); borrar sus datos las elimina. Para generar propuestas, el escenario y el texto de los documentos leídos se envían al servidor y al proveedor de IA. No introduzcas contraseñas ni secretos.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PageHead({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  const { view } = useI18n();
  return view(
    <div className="rise mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{kicker}</div>
        <h1 className="font-display mt-2 text-4xl md:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function LocalNotice({ error }: { error?: string | null }) {
  const { view } = useI18n();
  return view(
    <div role="status" data-testid="text-local-notice" className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${error ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border bg-muted/50 text-muted-foreground"}`}>
      <span className="shrink-0 font-mono uppercase tracking-wider">{error ? "Error" : "Local"}</span>
      <span>{error ?? "Historial guardado en este navegador. Al analizar, el escenario y las fuentes se procesan con IA."}</span>
    </div>
  );
}
