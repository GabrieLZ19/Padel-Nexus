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
    provincia?: string,
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
      );

    if (alcance && alcance !== "Global") {
      query = query.eq("alcance", alcance);
    }

    query = query.order("puntos", { ascending: false }).limit(100);

    if (categoria && categoria !== "Todas") {
      query = query.eq("categoria", categoria);
    }

    if (provincia) {
      query = query.eq("perfiles.lugar_residencia", provincia);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener ranking global:", error);
      throw new Error("Error interno al obtener el listado de clasificación.");
    }

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
      .select("id, puntos")
      .eq("usuario_id", datos.usuarioId)
      .eq("categoria", datos.categoria)
      .eq("alcance", alcanceFinal)
      .maybeSingle();

    const puntosAnteriores = rankingActual?.puntos || 0;
    const nuevosPuntos = puntosAnteriores + datos.puntosASumar;

    // Actualizamos o insertamos de forma segura con un upsert reglamentario
    const { error: rankError } = await supabaseAdmin.from("rankings").upsert(
      {
        ...(rankingActual?.id ? { id: rankingActual.id } : {}),
        usuario_id: datos.usuarioId,
        puntos: nuevosPuntos,
        categoria: datos.categoria,
        alcance: alcanceFinal,
        provincia_jurisdiccion: datos.provinciaJurisdiccion || null,
      },
      { onConflict: "id" }, // Usamos la clave primaria por seguridad de restricciones
    );

    if (rankError) {
      console.error(`Error al actualizar la billetera de puntos para usuario ${datos.usuarioId}:`, rankError);
      throw new Error(
        `Error al actualizar la billetera de puntos: ${rankError.message}`,
      );
    }

    // Dejamos registro en el historial para auditorías deportivas
    const { error: histError } = await supabaseAdmin.from("historial_ranking").insert([
      {
        usuario_id: datos.usuarioId,
        torneo_id: datos.torneoId,
        puntos_anteriores: puntosAnteriores,
        puntos_nuevos: nuevosPuntos,
      },
    ]);

    if (histError) {
      console.error(`Error al insertar historial de ranking para usuario ${datos.usuarioId}:`, histError);
      throw new Error(`Error al registrar en historial de ranking: ${histError.message}`);
    }

    return nuevosPuntos;
  }
}
