import { inferirProvinciaDesdeLocalidad } from "./localidadProvinciaArgentina";
import { provinciaCanonicaArgentina } from "./provinciaRanking";

/** Separa localidad y provincia cuando `lugar_residencia` viene como "Localidad, Provincia". */
export function partesLugarResidenciaPerfil(lugarResidencia?: string | null): {
  localidad?: string;
  provinciaExplicita?: string;
} {
  const lr = String(lugarResidencia || "").trim();
  if (!lr) return {};
  if (lr.includes("|")) {
    const parts = lr
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return {
        localidad: parts[0],
        provinciaExplicita: parts[parts.length - 1],
      };
    }
  }
  const coma = lr.indexOf(",");
  if (coma >= 0) {
    const localidad = lr.slice(0, coma).trim();
    const provinciaExplicita = lr.slice(coma + 1).trim();
    if (localidad && provinciaExplicita) {
      return { localidad, provinciaExplicita };
    }
  }
  return { localidad: lr };
}

/**
 * Provincia efectiva para ranking, zonas y denominación nacional.
 * `lugar_residencia` guarda localidad (CLI-1); no se usa el nombre de localidad como provincia.
 */
export function provinciaEfectivaDesdePerfil(
  lugarResidencia?: string | null,
  clubProvincia?: string | null,
): string {
  const { localidad, provinciaExplicita } =
    partesLugarResidenciaPerfil(lugarResidencia);

  if (provinciaExplicita) {
    const canon = provinciaCanonicaArgentina(provinciaExplicita);
    if (canon) return canon;
  }

  if (localidad) {
    const canon = provinciaCanonicaArgentina(localidad);
    if (canon) return canon;
    const inferida = inferirProvinciaDesdeLocalidad(localidad);
    if (inferida) return inferida;
  }
  const club = (clubProvincia || "").trim();
  if (club) {
    return provinciaCanonicaArgentina(club) || club;
  }
  return "";
}