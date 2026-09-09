import { calcularEdadEnFecha } from "./inscripcionElegibilidad";

export { calcularEdadEnFecha };

/** Edad en años cumplidos a la fecha de hoy (zona local del servidor). */
export function calcularEdadActual(fechaNacimiento: string): number {
  return calcularEdadEnFecha(fechaNacimiento, new Date());
}

export function esMenorDeEdad(fechaNacimiento: string): boolean {
  return calcularEdadActual(fechaNacimiento) < 18;
}
