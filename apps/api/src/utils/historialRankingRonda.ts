import { supabaseAdmin } from "../config/supabase";

type FilaHistorial = {
  torneo_id?: string | null;
  ronda?: string | null;
  created_at?: string | null;
};

/** Reconstruye `ronda` en movimientos legacy sin columna cargada (PUB-16). */
export async function enriquecerHistorialConRonda<T extends FilaHistorial>(
  usuarioId: string,
  historial: T[],
): Promise<T[]> {
  const uid = String(usuarioId || "").trim();
  if (!uid || historial.length === 0) return historial;

  const sinRonda = historial.filter(
    (h) => !String(h.ronda || "").trim() && h.torneo_id,
  );
  if (sinRonda.length === 0) return historial;

  const torneoIds = [
    ...new Set(sinRonda.map((h) => String(h.torneo_id)).filter(Boolean)),
  ];
  if (torneoIds.length === 0) return historial;

  const { data: inscripciones } = await supabaseAdmin
    .from("inscripciones")
    .select("id, torneo_id")
    .in("torneo_id", torneoIds)
    .or(`usuario_id.eq.${uid},usuario2_id.eq.${uid}`);

  const inscPorTorneo = new Map<string, Set<string>>();
  for (const ins of inscripciones || []) {
    const tid = String(ins.torneo_id || "");
    const id = String(ins.id || "");
    if (!tid || !id) continue;
    const set = inscPorTorneo.get(tid) || new Set<string>();
    set.add(id);
    inscPorTorneo.set(tid, set);
  }

  const { data: partidos } = await supabaseAdmin
    .from("partidos")
    .select("torneo_id, ronda, equipo_a_id, equipo_b_id, orden, fecha_partido")
    .in("torneo_id", torneoIds)
    .not("ganador", "is", null);

  if (!partidos?.length) return historial;

  return historial.map((h) => {
    if (String(h.ronda || "").trim()) return h;
    const tid = String(h.torneo_id || "");
    const inscIds = inscPorTorneo.get(tid);
    if (!inscIds?.size) return h;

    const candidatos = partidos.filter(
      (p) =>
        String(p.torneo_id) === tid &&
        (inscIds.has(String(p.equipo_a_id)) ||
          inscIds.has(String(p.equipo_b_id))),
    );
    if (candidatos.length === 0) return h;

    const tHist = h.created_at
      ? new Date(String(h.created_at)).getTime()
      : Number.NaN;

    let elegido = candidatos[0];
    let mejorScore = Number.POSITIVE_INFINITY;
    for (const p of candidatos) {
      const tPartido = p.fecha_partido
        ? new Date(String(p.fecha_partido)).getTime()
        : Number.NaN;
      const deltaTiempo = Number.isFinite(tHist) && Number.isFinite(tPartido)
        ? Math.abs(tPartido - tHist)
        : Number.POSITIVE_INFINITY;
      const orden = Number(p.orden) || 0;
      const score = deltaTiempo * 1e6 - orden;
      if (score < mejorScore) {
        mejorScore = score;
        elegido = p;
      }
    }

    const ronda = String(elegido.ronda || "").trim();
    return ronda ? { ...h, ronda } : h;
  });
}
