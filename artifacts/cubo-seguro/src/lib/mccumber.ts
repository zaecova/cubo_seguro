import type { ProposalDimension } from "@workspace/api-client-react";

export type Axis = "principle" | "state" | "countermeasure";

export const AXES: Record<Axis, { label: string; question: string; items: { key: string; label: string; desc: string }[] }> = {
  principle: {
    label: "Principio",
    question: "¿Qué propiedad de seguridad se compromete?",
    items: [
      { key: "C", label: "Confidencialidad", desc: "Solo las personas autorizadas pueden acceder a la información." },
      { key: "I", label: "Integridad", desc: "La información es exacta, completa y no se altera sin autorización." },
      { key: "D", label: "Disponibilidad", desc: "La información está accesible para quien la necesita, cuando la necesita." },
    ],
  },
  state: {
    label: "Estado",
    question: "¿En qué estado está la información cuando se expone?",
    items: [
      { key: "A", label: "Almacenamiento", desc: "Datos en reposo: discos, bases de datos, copias de seguridad." },
      { key: "T", label: "Transmisión", desc: "Datos en tránsito entre sistemas, redes o personas." },
      { key: "P", label: "Procesamiento", desc: "Datos en uso mientras una aplicación o persona los transforma." },
    ],
  },
  countermeasure: {
    label: "Contramedida",
    question: "¿Con qué tipo de salvaguarda se protege?",
    items: [
      { key: "Te", label: "Tecnología", desc: "Controles técnicos: cifrado, cortafuegos, autenticación, registros." },
      { key: "Po", label: "Políticas y prácticas", desc: "Normas, procedimientos y directrices administrativas." },
      { key: "Pe", label: "Personas", desc: "Formación, concienciación y cultura de seguridad." },
    ],
  },
};

export const DIMENSION_LABEL: Record<ProposalDimension, string> = {
  principle: "Principio",
  state: "Estado",
  information: "Información afectada",
  countermeasure: "Contramedida",
};

export const DIMENSION_ORDER: ProposalDimension[] = ["information", "principle", "state", "countermeasure"];
