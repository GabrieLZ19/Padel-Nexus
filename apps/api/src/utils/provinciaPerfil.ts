import { inferirProvinciaDesdeLocalidad } from "./localidadProvinciaArgentina";
import { provinciaCanonicaArgentina } from "./provinciaRanking";

/**
 * Provincia efectiva para ranking, zonas y denominación nacional.
 * `lugar_residencia` guarda localidad (CLI-1); no se usa el nombre de localidad como provincia.
 */
export function provinciaEfectivaDesdePerfil(
  lugarResidencia?: string | null,
  clubProvincia?: string | null,
): string {
  const lr = (lugarResidencia || "").trim();
  if (lr) {
    const canon = provinciaCanonicaArgentina(lr);
    if (canon) return canon;
    const inferida = inferirProvinciaDesdeLocalidad(lr);
    if (inferida) return inferida;
  }
  const club = (clubProvincia || "").trim();
  if (club) {
    return provinciaCanonicaArgentina(club) || club;
  }
  return "";
}