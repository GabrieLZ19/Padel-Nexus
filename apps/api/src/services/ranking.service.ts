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
    pais?: string,
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
          lugar_residencia,
          pais
        )
      `,
      );

    const alcanceBusqueda = alcance === "Nacional" ? "Provincial" : alcance;

    if (alcanceBusqueda && alcanceBusqueda !== "Global") {
      query = query.eq("alcance", alcanceBusqueda);
    }

    query = query.order("puntos", { ascending: false }).limit(100);

    if (categoria && categoria !== "Todas") {
      query = query.eq("categoria", categoria);
    }

    if (alcance === "Nacional" && pais) {
      query = query.eq("perfiles.pais", pais);
    }

    if (provincia && alcance !== "Global" && alcance !== "Nacional") {
      query = query.eq("perfiles.lugar_residencia", provincia);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener ranking global:", error);
      throw new Error("Error interno al obtener el listado de clasificación.");
    }

    // Tipamos la respuesta para evitar 'any' de manera segura
    type RowRanking = Record<string, unknown> & {
      usuario_id: string;
      pj?: number;
      pg?: number;
      tendencia?: number;
      perfiles?: Record<string, unknown>;
    };

    // Obtener los IDs de los usuarios para buscar afiliaciones activas
    const userIds = ((data as RowRanking[]) || []).map((jugador) => jugador.usuario_id);
    const afiliacionesMap: Record<string, { nombre: string; provincia: string }> = {};

    if (userIds.length > 0) {
      const { data: afs } = await supabaseAdmin
        .from("afiliaciones")
        .select("usuario_id, entidad")
        .eq("estado", "activo")
        .in("usuario_id", userIds);

      const nombresClubes = Array.from(new Set(afs?.map((a) => a.entidad).filter(Boolean) || []));
      const clubesMap: Record<string, string> = {};

      if (nombresClubes.length > 0) {
        const { data: clubs } = await supabaseAdmin
          .from("clubes")
          .select("nombre, provincia")
          .in("nombre", nombresClubes);

        clubs?.forEach((c) => {
          clubesMap[c.nombre] = c.provincia;
        });
      }

      afs?.forEach((a) => {
        afiliacionesMap[a.usuario_id] = {
          nombre: a.entidad,
          provincia: clubesMap[a.entidad] || "",
        };
      });
    }

    return ((data as RowRanking[]) || []).map((jugador, index) => {
      const perfilObj = jugador.perfiles || {};
      const clubInfo = afiliacionesMap[jugador.usuario_id] || null;

      return {
        ...jugador,
        posicion_actual: index + 1,
        pj: jugador.pj || 0,
        pg: jugador.pg || 0,
        tendencia: jugador.tendencia || 0,
        perfiles: {
          ...perfilObj,
          clubes: clubInfo,
        },
      };
    });
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
