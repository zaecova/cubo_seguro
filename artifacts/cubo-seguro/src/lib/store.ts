import { useCallback, useEffect, useState } from "react";
import type { Proposal, RiskAnalysis } from "@workspace/api-client-react";

export type ReviewStatus = "pending" | "approved" | "rejected";
export interface ProposalReview {
  status: ReviewStatus;
  editedText?: string;
  updatedAt?: string;
}
export interface Evaluation {
  analysis: RiskAnalysis;
  reviews: Record<string, ProposalReview>;
  savedAt: string;
}

const KEY = "cubo-seguro:evaluaciones:v1";
const EVT = "cubo-seguro:store";

function read(): { items: Evaluation[]; error: string | null } {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { items: [], error: null };
    const parsed = JSON.parse(raw);
    return { items: Array.isArray(parsed) ? parsed : [], error: null };
  } catch {
    return { items: [], error: "No se pudo leer el almacenamiento local del navegador." };
  }
}

function write(items: Evaluation[]): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVT));
    return null;
  } catch {
    return "El navegador rechazó el guardado (almacenamiento lleno, bloqueado o en modo privado).";
  }
}

export function newEvaluation(analysis: RiskAnalysis): Evaluation {
  const reviews: Record<string, ProposalReview> = {};
  analysis.proposals.forEach((p) => (reviews[p.id] = { status: "pending" }));
  return { analysis, reviews, savedAt: new Date().toISOString() };
}

export function saveEvaluation(ev: Evaluation): string | null {
  const { items } = read();
  const next = [ev, ...items.filter((i) => i.analysis.id !== ev.analysis.id)];
  return write(next);
}

export function useEvaluations() {
  const [state, setState] = useState(read);
  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((id: string, fn: (e: Evaluation) => Evaluation): string | null => {
    const { items } = read();
    const next = items.map((i) => (i.analysis.id === id ? fn(i) : i));
    return write(next);
  }, []);

  const remove = useCallback((id: string): string | null => {
    const { items } = read();
    return write(items.filter((i) => i.analysis.id !== id));
  }, []);

  return { evaluations: state.items, error: state.error, update, remove };
}

export function finalText(p: Proposal, r?: ProposalReview) {
  return r?.editedText ?? p.text;
}

export function counts(ev: Evaluation) {
  const c = { pending: 0, approved: 0, rejected: 0 };
  ev.analysis.proposals.forEach((p) => c[ev.reviews[p.id]?.status ?? "pending"]++);
  return c;
}
