export function capacidadZona(parejasCount: number): 2 | 3 | 4 {
  if (parejasCount === 4) return 4;
  if (parejasCount === 2) return 2;
  return 3;
}

export function clasificadosPorZona(parejasCount: number): number {
  if (parejasCount === 4) return 3;
  if (parejasCount === 2) return 1;
  return 2;
}

export function partidosEsperadosEnZona(parejasCount: number): number {
  if (parejasCount === 4) return 4;
  if (parejasCount === 2) return 1;
  return 3;
}

export function partidoZonaPendiente(partido: {
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  ganador?: string | null;
}): boolean {
  if (!partido.equipo_a_id || !partido.equipo_b_id) return true;
  return !partido.ganador;
}

export type PartidoClasificacionZona = {
  orden?: number | null;
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  ganador?: string | null;
  estado_partido?: string | null;
};

function perdedorDePartido(p: PartidoClasificacionZona): string | null {
  if (!p.ganador || !p.equipo_a_id || !p.equipo_b_id) return null;
  return p.ganador === p.equipo_a_id ? p.equipo_b_id : p.equipo_a_id;
}

function partidosZonaCuatroOrdenados(
  partidos: PartidoClasificacionZona[],
): PartidoClasificacionZona[] {
  return [...partidos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

export function esFixtureZonaCuatroGanadoresPerdedores(
  partidos: PartidoClasificacionZona[],
  capacidadParejas: number,
): boolean {
  if (capacidadParejas !== 4) return false;
  if (partidos.length !== 4) return false;
  const [p1, p2, p3, p4] = partidosZonaCuatroOrdenados(partidos);
  if (!p1?.equipo_a_id || !p2?.equipo_a_id) return false;
  const finalesMarcadas =
    /ganadores/i.test(String(p3?.estado_partido || "")) ||
    /perdedores/i.test(String(p4?.estado_partido || ""));
  const cuatroCruces = partidos.every(
    (p) => p.equipo_a_id && p.equipo_b_id,
  );
  return finalesMarcadas || (!finalesMarcadas && cuatroCruces);
}

export function puedeClasificarZonaCuatroPorFinales(
  partidos: PartidoClasificacionZona[],
  capacidadParejas: number,
): boolean {
  if (!esFixtureZonaCuatroGanadoresPerdedores(partidos, capacidadParejas)) {
    return false;
  }
  const sorted = partidosZonaCuatroOrdenados(partidos);
  const pGanadores = sorted[2];
  const pPerdedores = sorted[3];
  return Boolean(
    pGanadores?.ganador &&
      pPerdedores?.ganador &&
      pGanadores.equipo_a_id &&
      pGanadores.equipo_b_id &&
      pPerdedores.equipo_a_id &&
      pPerdedores.equipo_b_id,
  );
}

export function ordenInscripcionesZonaCuatroFinales(
  partidos: PartidoClasificacionZona[],
): string[] {
  const [, , pGanadores, pPerdedores] = partidosZonaCuatroOrdenados(partidos);
  const segundo = perdedorDePartido(pGanadores!);
  const cuarto = perdedorDePartido(pPerdedores!);
  if (!pGanadores?.ganador || !segundo || !pPerdedores?.ganador || !cuarto) {
    return [];
  }
  return [pGanadores.ganador, segundo, pPerdedores.ganador, cuarto];
}

export function textoClasificacionZonas(
  zonas: Array<{ parejas?: unknown[]; capacidad?: number }>,
): string {
  if (!zonas.length) return "Sin zonas";

  const de2 = zonas.filter(
    (z) => capacidadZona(z.capacidad ?? z.parejas?.length ?? 0) === 2,
  ).length;
  const de3 = zonas.filter(
    (z) => capacidadZona(z.capacidad ?? z.parejas?.length ?? 0) === 3,
  ).length;
  const de4 = zonas.filter(
    (z) => capacidadZona(z.capacidad ?? z.parejas?.length ?? 0) === 4,
  ).length;

  const partes: string[] = [];
  if (de2 > 0) {
    partes.push(
      `${de2} zona${de2 === 1 ? "" : "s"} de 2: clasifica 1º`,
    );
  }
  if (de3 > 0) {
    partes.push(
      `${de3} zona${de3 === 1 ? "" : "s"} de 3: clasifican 1º y 2º`,
    );
  }
  if (de4 > 0) {
    partes.push(
      `${de4} zona${de4 === 1 ? "" : "s"} de 4: clasifican 1º, 2º y 3º`,
    );
  }
  partes.push("se elimina 1 pareja por zona (salvo zona de 2)");
  return partes.join(" · ");
}

export function zonaGrupoCompleta(
  partidosZona: Array<{
    equipo_a_id?: string | null;
    equipo_b_id?: string | null;
    ganador?: string | null;
  }>,
): boolean {
  if (partidosZona.length === 0) return false;

  const teamIds = new Set<string>();
  partidosZona.forEach((p) => {
    if (p.equipo_a_id) teamIds.add(p.equipo_a_id);
    if (p.equipo_b_id) teamIds.add(p.equipo_b_id);
  });

  const esperados = partidosEsperadosEnZona(teamIds.size);
  const finalizados = partidosZona.filter((p) => p.ganador).length;
  const pendientesSinEquipos = partidosZona.some(
    (p) => !p.equipo_a_id || !p.equipo_b_id,
  );

  if (pendientesSinEquipos) return false;
  return finalizados >= esperados;
}
