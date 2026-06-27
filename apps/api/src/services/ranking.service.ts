import { supabaseAdmin } from "../config/supabase";

export interface ActualizarPuntosDTO {
  usuarioId: string;
  puntosASumar: number;
  categoria: string;
  torneoId: string;
  alcance?: "Provincial" | "Nacional" | "Global";
  provinciaJurisdiccion?: string;
}

export class RankingService {
  /**
   * Obtiene la billetera de ranking de un jugador específico junto con su historial deportivo
   */
  static async obtenerRankingPorUsuario(usuarioId: string) {
    const { data, error } = await supabaseAdmin
      .from("rankings")
      .select(
        `
        *, 
        perfiles (
          nombre_completo, 
          categoria_padel, 
          avatar_url,
          lugar_residencia
        ),
        historial_ranking (torneo_id, puntos_nuevos, created_at)
      `,
      )
      .eq("usuario_id", usuarioId)
      .order("created_at", {
        referencedTable: "historial_ranking",
        ascending: false,
      });

    if (error || !data)
      throw new Error(
        "No se encontraron registros de ranking para este jugador.",
      );
    return data;
  }

  /**
   * Obtiene el listado de clasificación general filtrado por nivel/categoría y alcance jurisdiccional
   */
  static async obtenerRankingGlobal(
    categoria?: string,
    alcance: string = "Provincial",
  ) {
    let query = supabaseAdmin
      .from("rankings")
      .select(
        `
        *, 
        perfiles!inner (
          nombre,
          apellido,
          avatar_url,
          lugar_residencia
        )
      `,
      )
      .eq("alcance", alcance)
      .order("puntos", { ascending: false })
      .limit(100);

    if (categoria && categoria !== "Todas") {
      query = query.eq("categoria", categoria);
    }

    const { data, error } = await query;
    if (error)
      throw new Error("Error interno al obtener el listado de clasificación.");

    // Tipamos la respuesta para evitar 'any' de manera segura
    type RowRanking = Record<string, unknown> & {
      pj?: number;
      pg?: number;
      tendencia?: number;
    };

    return ((data as RowRanking[]) || []).map((jugador, index) => ({
      ...jugador,
      posicion_actual: index + 1,
      pj: jugador.pj || 0,
      pg: jugador.pg || 0,
      tendencia: jugador.tendencia || 0,
    }));
  }

  /**
   * Modifica o inicializa de forma controlada los puntos de un jugador (Admin Override)
   */
  static async actualizarPuntosJugador(datos: ActualizarPuntosDTO) {
    const alcanceFinal = datos.alcance || "Provincial";

    // Buscamos si ya tiene una billetera existente en esa categoría y alcance
    const { data: rankingActual } = await supabaseAdmin
      .from("rankings")
      .select("puntos")
      .eq("usuario_id", datos.usuarioId)
      .eq("categoria", datos.categoria)
      .eq("alcance", alcanceFinal)
      .maybeSingle();

    const puntosAnteriores = rankingActual?.puntos || 0;
    const nuevosPuntos = puntosAnteriores + datos.puntosASumar;

    // Actualizamos o insertamos de forma segura con un upsert reglamentario
    const { error: rankError } = await supabaseAdmin.from("rankings").upsert(
      {
        usuario_id: datos.usuarioId,
        puntos: nuevosPuntos,
        categoria: datos.categoria,
        alcance: alcanceFinal,
        provincia_jurisdiccion: datos.provinciaJurisdiccion || null,
      },
      { onConflict: "id" }, // Usamos la clave primaria por seguridad de restricciones
    );

    if (rankError)
      throw new Error(
        `Error al actualizar la billetera de puntos: ${rankError.message}`,
      );

    // Dejamos registro en el historial para auditorías deportivas
    await supabaseAdmin.from("historial_ranking").insert([
      {
        usuario_id: datos.usuarioId,
        torneo_id: datos.torneoId,
        puntos_anteriores: puntosAnteriores,
        puntos_nuevos: nuevosPuntos,
      },
    ]);

    return nuevosPuntos;
  }
}
