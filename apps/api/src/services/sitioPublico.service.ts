import { supabaseAdmin } from "../config/supabase";
import { esVisibleEnSitioPublico } from "../utils/datoPrueba";
import { ClubService } from "./club.service";
import { TorneoService } from "./torneo.service";

export interface CifrasSitioPublico {
  jugadores: number;
  torneos: number;
  clubes: number;
  canchas: number;
}

export class SitioPublicoService {
  static async cifras(): Promise<CifrasSitioPublico> {
    const [jugadoresRes, listadoTorneos, clubesReserva] = await Promise.all([
      supabaseAdmin
        .from("perfiles")
        .select("nombre, apellido, email, es_prueba, rol"),
      TorneoService.listarTorneos(undefined, 50_000, { ocultarPrueba: true }),
      ClubService.contadoresListadoReservaPublico(),
    ]);

    if (jugadoresRes.error) throw new Error(jugadoresRes.error.message);

    const jugadores = (jugadoresRes.data || []).filter((perfil) =>
      esVisibleEnSitioPublico(perfil),
    ).length;

    return {
      jugadores,
      torneos: listadoTorneos.total,
      clubes: clubesReserva.clubes,
      canchas: clubesReserva.canchas,
    };
  }
}
