/** Misma lógica que `apps/api/src/utils/diasJuegoTorneo.ts` (etiquetas Paso 3). */

export function generarDiasJuegoDefault(
  fechaInicio?: string | null,
  fechaFin?: string | null,
): string[] {
  if (!fechaInicio) {
    return ["Viernes", "Sábado", "Domingo"];
  }
  const startStr = fechaInicio.split("T")[0];
  const endStr = fechaFin ? fechaFin.split("T")[0] : startStr;
  const start = new Date(`${startStr}T12:00:00Z`);
  const end = new Date(`${endStr}T12:00:00Z`);

  const dias: string[] = [];
  const current = new Date(start);
  let limit = 0;

  const nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  while (current <= end && limit < 15) {
    const dayName = nombresDias[current.getUTCDay()];
    const dayNum = current.getUTCDate();
    dias.push(`${dayName} ${dayNum}`);
    current.setUTCDate(current.getUTCDate() + 1);
    limit++;
  }

  return dias.length > 0 ? dias : ["Viernes", "Sábado", "Domingo"];
}

export type DiaCompetenciaUi = { label: string; value: string };

export function diasCompetenciaDesdeFechas(
  fechaInicio?: string | null,
  fechaFin?: string | null,
): DiaCompetenciaUi[] {
  const values = generarDiasJuegoDefault(fechaInicio, fechaFin);
  if (!fechaInicio) {
    return values.map((v) => ({ label: v, value: v }));
  }
  const startStr = fechaInicio.split("T")[0];
  const endStr = fechaFin ? fechaFin.split("T")[0] : startStr;
  const start = new Date(`${startStr}T12:00:00Z`);
  const end = new Date(`${endStr}T12:00:00Z`);
  const current = new Date(start);
  const days: DiaCompetenciaUi[] = [];
  let limit = 0;
  while (current <= end && limit < 15) {
    const dayName = current.toLocaleDateString("es-AR", {
      weekday: "short",
      timeZone: "UTC",
    });
    const capitalized =
      dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
    const dayNum = current.getUTCDate();
    const monthName = current.toLocaleDateString("es-AR", {
      month: "short",
      timeZone: "UTC",
    });
    const capitalizedMonth =
      monthName.charAt(0).toUpperCase() + monthName.slice(1).replace(".", "");
    const label = `${capitalized} ${dayNum} ${capitalizedMonth}`;
    const value = values[limit] ?? `${capitalized} ${dayNum}`;
    days.push({ label, value });
    current.setUTCDate(current.getUTCDate() + 1);
    limit++;
  }
  return days.length > 0 ? days : values.map((v) => ({ label: v, value: v }));
}