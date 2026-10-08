---
name: Sincronización y análisis
description: Decisiones sobre consistencia de evidencia y alcance de trabajos de Drive.
---
La sincronización debe publicar el inventario de manera atómica y el análisis debe utilizar el último inventario completo, sin esperar a terminar otra descarga.

**Why:** Separar solo el botón de sincronización no elimina las peticiones largas si el análisis vuelve a esperar al mismo trabajo. Usar resultados intermedios además haría variar la cobertura según el momento de la consulta.

**How to apply:** Si no existe un inventario completo, usar las referencias oficiales externas disponibles y declarar que no se consultó Drive. Si existe uno anterior, indicar que se usa ese mientras se actualiza. No convertir el sondeo de progreso en nuevas sincronizaciones ni reintentos automáticos.

En «Resumen» mostrar una sola respuesta integrada, considerando información de Drive u otras fuentes aceptables.

**Why:** El usuario pidió «solamente una respuesta» en ese ítem, no tres propuestas separadas ni una sincronización obligatoria para obtenerla.

**How to apply:** Mantener la revisión detallada de las tres dimensiones como opción separada, sin redirigir automáticamente desde Resumen. Conservar la distinción entre inferencia y cita documental.

No mostrar el ítem «Resumen» en el menú de navegación.

**Why:** El usuario pidió quitar ese ítem después de simplificar su respuesta.

**How to apply:** No volver a añadirlo al menú al modificar la navegación; esta petición no autoriza borrar evaluaciones guardadas.

En «Describe», pedir solamente Título y Contenido; el usuario menciona amenaza, vulnerabilidad e información afectada dentro del contenido.

**Why:** El usuario pidió escribir esos elementos juntos, sin campos separados.

**How to apply:** Conservar su texto original en revisión y exportación. Identificar elementos ausentes sin inventarlos. Mantener legibles las evaluaciones anteriores con campos separados.

El trabajo en segundo plano está acotado al proceso del servidor, no es una cola persistente.

**Why:** El alcance solicitado separa el trabajo de HTTP manteniendo el entorno privado existente, sin incorporar almacenamiento documental persistente ni habilitar producción.

**How to apply:** Avisar de que reiniciar el servidor interrumpe el trabajo; cualquier persistencia futura requiere decidir retención y aislamiento de documentos privados.
