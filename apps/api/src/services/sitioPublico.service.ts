import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_TORNEO } from "../constants/fap";
import { esTorneoDePrueba, esVisibleEnSitioPublico } from "../utils/datoPrueba";

export interface CifrasSitioPublico {
  jugadores: number;
  torneos: number;
  clubes: number;
  canchas: number;
}

export class SitioPublicoService {
  static async cifras(): Promise<CifrasSitioPublico> {
    const [jugadoresRes, torneosRes, clubesRes, canchasRes] = await Promise.all([
      supabaseAdmin
        .from("perfiles")
        .select("nombre, apellido, email, es_prueba, rol"),
      supabaseAdmin.from("torneos").select("nombre, es_prueba, estado"),
      supabaseAdmin.from("clubes").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("canchas").select("id", { count: "exact", head: true }),
    ]);

    if (jugadoresRes.error) throw new Error(jugadoresRes.error.message);
    if (torneosRes.error) throw new Error(torneosRes.error.message);
    if (clubesRes.error) throw new Error(clubesRes.error.message);
    if (canchasRes.error) throw new Error(canchasRes.error.message);

    const jugadores = (jugadoresRes.data || []).filter((perfil) =>
      esVisibleEnSitioPublico(perfil),
    ).length;
    const torneos = (torneosRes.data || []).filter(
      (torneo) =>
        torneo.estado !== FAP_ESTADOS_TORNEO.BORRADOR &&
        !esTorneoDePrueba(torneo),
    ).length;

    return {
      jugadores,
      torneos,
      clubes: clubesRes.count || 0,
      canchas: canchasRes.count || 0,
    };
  }
}
