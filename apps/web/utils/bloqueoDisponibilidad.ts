import type { BloqueoTipo } from "@/utils/types/club.types";

export const ETIQUETA_TIPO_BLOQUEO: Record<BloqueoTipo, string> = {
  torneo: "Torneo",
  abono: "Abono / fijo",
  mantenimiento: "Mantenimiento",
  otro: "Otro",
};

export function resumenBloqueoAgenda(
  tipo: string | null | undefined,
  motivo?: string | null,
): string {
  const tipoLabel =
    (tipo && ETIQUETA_TIPO_BLOQUEO[tipo as BloqueoTipo]) || tipo || "";
  const partes: string[] = [];
  if (tipoLabel) partes.push(tipoLabel);
  const m = motivo?.trim();
  if (m) partes.push(m);
  return partes.join(" · ");
}
