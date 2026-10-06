import { AXES, type Axis } from "./mccumber";
import { newEvaluation } from "./store";

const EXAMPLES: Record<Axis, string[][]> = {
  principle: [
    [
      "Restringir los expedientes médicos al personal autorizado para evitar que otros empleados consulten datos de pacientes.",
      "Cifrar los archivos de nómina para que la pérdida de un portátil no exponga los salarios y cuentas bancarias.",
      "Verificar al destinatario antes de enviar un informe confidencial y compartirlo mediante un enlace con acceso limitado.",
    ],
    [
      "Registrar y revisar los cambios en las cuentas bancarias de proveedores para detectar modificaciones no autorizadas.",
      "Verificar la firma digital de una actualización antes de instalarla para comprobar su origen y detectar alteraciones.",
      "Validar importes y totales al importar transacciones para evitar registros incompletos o inconsistentes.",
    ],
    [
      "Probar la restauración de las copias de seguridad para recuperar el sistema de ventas después de una falla.",
      "Mantener un servidor de respaldo para que el servicio continúe cuando el servidor principal deja de funcionar.",
      "Establecer límites de solicitudes y protección frente a denegación de servicio para mantener disponible el portal.",
    ],
  ],
  state: [
    [
      "Proteger con cifrado los datos de clientes almacenados en la base de datos y limitar el acceso a sus copias.",
      "Definir permisos sobre los contratos guardados en carpetas compartidas para evitar lecturas o cambios indebidos.",
      "Conservar una copia de seguridad aislada y comprobar su recuperación para proteger los archivos en reposo.",
    ],
    [
      "Usar HTTPS para proteger los datos personales que viajan desde el navegador hasta el servidor.",
      "Transferir reportes entre sedes mediante un canal cifrado con autenticación de ambos extremos.",
      "Comprobar el destinatario y los permisos al compartir información por correo para evitar envíos a personas equivocadas.",
    ],
    [
      "Ocultar datos bancarios en pantallas y registros mientras una aplicación calcula pagos.",
      "Validar las entradas antes de calcular una factura para impedir que datos manipulados alteren el resultado.",
      "Limitar los permisos del proceso que analiza expedientes para que solo acceda a los datos necesarios.",
    ],
  ],
  countermeasure: [
    [
      "Activar autenticación multifactor en el portal de nóminas para reducir el riesgo de acceso con contraseñas robadas.",
      "Configurar un cortafuegos para permitir únicamente las conexiones necesarias hacia la base de datos.",
      "Generar alertas automáticas ante cambios inusuales en archivos críticos y revisar sus registros.",
    ],
    [
      "Establecer un procedimiento de altas y bajas que retire los accesos al finalizar una relación laboral.",
      "Definir una política de clasificación que indique cómo almacenar y compartir información confidencial.",
      "Documentar y ensayar el procedimiento de respuesta a incidentes, con responsables y pasos de recuperación.",
    ],
    [
      "Capacitar al personal para identificar correos de phishing y reportarlos sin abrir enlaces sospechosos.",
      "Practicar la verificación de identidad antes de entregar información por teléfono.",
      "Realizar ejercicios con el equipo para reconocer un incidente y comunicarlo al responsable de seguridad.",
    ],
  ],
};

export function exampleEvaluation(axis: Axis, index: number) {
  const layer = AXES[axis].items[index];
  const id = `ejemplos-mccumber-${axis}-${layer.key}`;
  return newEvaluation({
    id,
    createdAt: new Date().toISOString(),
    input: {
      title: `Ejemplos: ${AXES[axis].label} · ${layer.label}`,
      threat: "Situaciones ficticias de aprendizaje; no es un análisis de riesgo real.",
      vulnerability: `Ejemplos centrados en ${layer.label.toLowerCase()}.`,
      information: "La información afectada se describe en cada ejemplo.",
    },
    warning: "Ejemplos didácticos predefinidos, sin consulta a Drive ni generación de IA en tiempo real.",
    proposals: EXAMPLES[axis][index].map((text, i) => ({
      id: `${id}-${i + 1}`,
      dimension: axis,
      category: `${layer.label} · Ejemplo ${i + 1}`,
      text,
      rationale: `${AXES[axis].label}: ${layer.label}. ${layer.desc}`,
      evidence: [],
    })),
  });
}
