---
name: Límites de extracción PDF
description: Motivo del aislamiento de descarga y tratamiento conservador de cobertura.
---
La descarga necesita un límite de tiempo externo al SDK de conectores.

**Why:** La versión del SDK disponible al implementar este soporte no acepta ni propaga AbortSignal en proxy; cancelar únicamente la lectura del cuerpo no detiene una solicitud bloqueada antes de recibir cabeceras.

**How to apply:** Mantener aislamiento terminable para descarga y extracción, salvo que se compruebe que una futura versión permite cancelar ambas fases. No sustituirlo por una carrera de promesas que deje solicitudes activas.

El usuario pidió incluir el PDF grande sin quitar límites de seguridad, ampliar el árbol autorizado ni implementar OCR.

**Why:** Es una ampliación acotada de cobertura documental, no permiso para procesar cualquier archivo o carpeta.

**How to apply:** Conservar límites de bytes, páginas, texto y tiempo, y distinguir extracción parcial de lectura sin recorte; solo el texto realmente extraído puede respaldar citas.
