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
    const [rankingsResult, historialResult] = await Promise.all([
      supabaseAdmin
        .from("rankings")
        .select(
          `
          *,
          perfiles (
            nombre,
            apellido,
            categoria_padel,
            avatar_url,
            lugar_residencia,
            clubes:clubes!perfiles_club_id_fkey (
              nombre,
              provincia
            )
          )
        `,
        )
        .eq("usuario_id", usuarioId),
      supabaseAdmin
        .from("historial_ranking")
        .select("torneo_id, puntos_nuevos, puntos_anteriores, created_at")
        .eq("usuario_id", usuarioId)
        .order("created_at", { ascending: false }),
    ]);

    if (rankingsResult.error) {
      console.error(
        `Error al obtener ranking del usuario ${usuarioId}:`,
        rankingsResult.error,
      );
      throw new Error(
        "No se pudieron cargar los registros de ranking del jugador.",
      );
    }

    if (historialResult.error) {
      console.error(
        `Error al obtener historial de ranking del usuario ${usuarioId}:`,
        historialResult.error,
      );
    }

    const historial = historialResult.data ?? [];

    return (rankingsResult.data ?? []).map((row) => ({
      ...row,
      historial_ranking: historial,
    }));
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
          id,
          nombre,
          apellido,
          dni,
          avatar_url,
          lugar_residencia,
          categoria_padel,
          sexo,
          fecha_nacimiento,
          pais,
          club_id,
          clubes (
            id,
            nombre,
            provincia
          )
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

    // Deduplicar jugadores por usuario_id (tomando su categoría con mayor puntuación, que viene primero en el ordenamiento)
    const seenUsers = new Set<string>();
    const uniqueData: RowRanking[] = [];
    
    for (const jugador of (data as RowRanking[] || [])) {
      if (!seenUsers.has(jugador.usuario_id)) {
        seenUsers.add(jugador.usuario_id);
        uniqueData.push(jugador);
      }
    }

    // Obtener los IDs de los usuarios para buscar afiliaciones activas
    const userIds = uniqueData.map((jugador) => jugador.usuario_id);
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

    return uniqueData.map((jugador, index) => {
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

  /**
   * Ranking por provincias en torneos nacionales (FAP):
   * 8 campeón · 6 finalista · 4 semis · 2 cuartos · 1 octavos.
   */
  static async rankingProvincialPorTorneo(torneoId: string) {
    const PUNTOS_POR_RONDA: Record<string, { ganador: number; perdedor: number }> =
      {
        FINAL: { ganador: 8, perdedor: 6 },
        SEMIS: { ganador: 0, perdedor: 4 },
        SEMIFINAL: { ganador: 0, perdedor: 4 },
        CUARTOS: { ganador: 0, perdedor: 2 },
        OCTAVOS: { ganador: 0, perdedor: 1 },
      };

    const { data: partidos, error } = await supabaseAdmin
      .from("partidos")
      .select("ronda, ganador, equipo_a_id, equipo_b_id")
      .eq("torneo_id", torneoId)
      .not("ganador", "is", null)
      .in("ronda", [
        "FINAL",
        "SEMIS",
        "SEMIFINAL",
        "CUARTOS",
        "OCTAVOS",
        "PRELIMINARES",
      ]);

    if (error) throw new Error(error.message);

    const puntosPorInscripcion = new Map<string, number>();
    const mejorRonda = new Map<string, number>();
    const rankRonda = (r: string) => {
      const u = r.toUpperCase();
      if (u === "FINAL") return 5;
      if (u.startsWith("SEMI")) return 4;
      if (u === "CUARTOS") return 3;
      if (u === "OCTAVOS") return 2;
      return 1;
    };

    for (const p of partidos || []) {
      const ronda = String(p.ronda || "").toUpperCase().trim();
      const tabla = PUNTOS_POR_RONDA[ronda];
      if (!tabla || !p.ganador) continue;

      const perdedor =
        p.ganador === p.equipo_a_id ? p.equipo_b_id : p.equipo_a_id;

      const apply = (inscripcionId: string | null, pts: number) => {
        if (!inscripcionId || pts <= 0) return;
        const prevRank = mejorRonda.get(inscripcionId) || 0;
        const thisRank = rankRonda(ronda);
        // Solo sumar puntos de la mejor instancia (evitar doble conteo de avances)
        if (thisRank < prevRank) return;
        if (thisRank > prevRank) {
          puntosPorInscripcion.set(inscripcionId, pts);
          mejorRonda.set(inscripcionId, thisRank);
        } else {
          const cur = puntosPorInscripcion.get(inscripcionId) || 0;
          if (pts > cur) puntosPorInscripcion.set(inscripcionId, pts);
        }
      };

      apply(p.ganador, tabla.ganador);
      apply(perdedor, tabla.perdedor);
    }

    // Campeón: ganador de FINAL = 8 (ya aplicado). Finalista = 6.
    const inscIds = [...puntosPorInscripcion.keys()];
    if (inscIds.length === 0) {
      return { torneoId, provincias: [] as Array<{ provincia: string; puntos: number; parejas: number }> };
    }

    const { data: inscs } = await supabaseAdmin
      .from("inscripciones")
      .select(
        `
        id,
        perfiles:perfiles!fk_inscripciones_usuario (
          lugar_residencia,
          clubes:clubes!perfiles_club_id_fkey (provincia)
        ),
        perfiles_j2:perfiles!fk_inscripciones_usuario2 (
          lugar_residencia,
          clubes:clubes!perfiles_club_id_fkey (provincia)
        )
      `,
      )
      .in("id", inscIds);

    const provinciaDe = (raw: unknown): string => {
      const p = raw as {
        lugar_residencia?: string;
        clubes?: { provincia?: string } | null;
      } | null;
      return (
        p?.clubes?.provincia ||
        p?.lugar_residencia ||
        "Sin provincia"
      );
    };

    const agg = new Map<string, { puntos: number; parejas: number }>();
    for (const ins of inscs || []) {
      const pts = puntosPorInscripcion.get(ins.id) || 0;
      if (pts <= 0) continue;
      const provA = provinciaDe(ins.perfiles);
      const provB = provinciaDe(ins.perfiles_j2);
      // Si misma provincia, suma una vez; si distintas, reparte mitad a cada una
      if (provA === provB) {
        const cur = agg.get(provA) || { puntos: 0, parejas: 0 };
        cur.puntos += pts;
        cur.parejas += 1;
        agg.set(provA, cur);
      } else {
        for (const prov of [provA, provB]) {
          const cur = agg.get(prov) || { puntos: 0, parejas: 0 };
          cur.puntos += pts / 2;
          cur.parejas += 0.5;
          agg.set(prov, cur);
        }
      }
    }

    const provincias = [...agg.entries()]
      .map(([provincia, v]) => ({
        provincia,
        puntos: Math.round(v.puntos * 10) / 10,
        parejas: Math.round(v.parejas * 10) / 10,
      }))
      .sort((a, b) => b.puntos - a.puntos);

    return { torneoId, provincias };
  }
}
