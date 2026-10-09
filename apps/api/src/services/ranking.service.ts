import { supabaseAdmin } from "../config/supabase";
import {
  CATEGORIAS_LIBRES,
  CATEGORIAS_MENORES,
  CATEGORIAS_VETERANOS,
  categoriasPorTipoRanking,
  normalizarProvincia,
  normalizarRama,
  type RamaRanking,
  type TipoRanking,
} from "../constants/rankings";
import {
  leerConfigPuntosProvincia,
  puntosInscripcionPorMejorInstancia,
  sumarPuntosPorProvincia,
} from "../utils/puntosProvincia";

export interface ActualizarPuntosDTO {
  usuarioId: string;
  puntosASumar: number;
  categoria: string;
  torneoId: string;
  alcance?: "Provincial" | "Nacional" | "Global";
  provinciaJurisdiccion?: string;
}

/**
 * Filtros aceptados por `obtenerRankingGlobal`.
 * Todos son opcionales; combinados en una sola query.
 */
export interface RankingGlobalFiltros {
  categoria?: string;
  alcance?: string;
  provincia?: string;
  pais?: string;
  /**
   * Tipo de ranking segun reglamento FAP.
   * Si se envia, restringe la lista de categorias a ese grupo.
   */
  tipoRanking?: TipoRanking;
  /**
   * Rama del ranking (masculino / femenino).
   * Se resuelve contra `perfiles.sexo` porque `rankings.rama` no distingue Damas/Caballeros.
   */
  rama?: string;
  /** Cantidad maxima de resultados a devolver (defecto 100). */
  limit?: number;
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
   * Obtiene el listado de clasificacion general filtrado por nivel/categoria,
   * alcance jurisdiccional, rama y tipo de ranking (menores/veteranos/libres).
   *
   * Reglas de ordenamiento (reglamento FAP):
   * 1. Puntos DESC.
   * 2. Ante igualdad, apellido y nombre ASC (orden alfabetico).
   */
  static async obtenerRankingGlobal(filtros: RankingGlobalFiltros = {}) {
    const {
      categoria,
      alcance = "Provincial",
      provincia,
      pais,
      tipoRanking,
      rama,
      limit = 100,
    } = filtros;

    let query = supabaseAdmin.from("rankings").select(
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

    // Orden principal + desempate alfabetico por apellido y nombre.
    query = query
      .order("puntos", { ascending: false })
      .order("apellido", {
        foreignTable: "perfiles",
        ascending: true,
        nullsFirst: false,
      })
      .order("nombre", {
        foreignTable: "perfiles",
        ascending: true,
        nullsFirst: false,
      })
      .limit(limit);

    if (categoria && categoria !== "Todas") {
      query = query.eq("categoria", categoria);
    } else if (tipoRanking) {
      // Si no viene categoria puntual pero si tipo de ranking, filtramos por
      // el conjunto de categorias definido para ese tipo.
      const categorias = categoriasPorTipoRanking(tipoRanking);
      if (categorias.length > 0) {
        query = query.in("categoria", [...categorias]);
      }
    }

    const ramaNormalizada: RamaRanking | null = normalizarRama(rama);
    if (ramaNormalizada) {
      query = query.eq("perfiles.sexo", ramaNormalizada);
    }

    if (alcance === "Nacional" && pais) {
      query = query.eq("perfiles.pais", pais);
    }

    // NOTA: el filtro de provincia se aplica en memoria (mas abajo) porque
    // `perfiles.lugar_residencia` mezcla acentos ("Cordoba" vs "Cordoba").
    // Aplicar `.eq()` directo excluiria filas validas por diferencia de tilde.
    //
    // Se aplica SIEMPRE que venga `provincia`, sin importar el alcance:
    // provincia es un filtro transversal (el usuario lo eligio explicitamente).
    // Cuando hay filtro provincial, elevamos el limite para tener margen tras
    // el filtrado en memoria.
    const debeFiltrarProvincia = Boolean(provincia);
    if (debeFiltrarProvincia) {
      query = query.limit(Math.max(limit, 500));
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
      perfiles?: Record<string, unknown> & {
        lugar_residencia?: string | null;
        clubes?: { provincia?: string | null } | null;
      };
    };

    let filas = (data as RowRanking[]) || [];

    // Filtro provincial insensible a acentos y mayusculas, aplicado en memoria.
    // Se resuelve UNICAMENTE contra `perfiles.lugar_residencia` (la provincia
    // que declara el jugador). Antes teniamos fallback al club, pero eso
    // introducia jugadores fuera de la provincia elegida (ej. residente en
    // Cordoba con club en Buenos Aires apareciendo bajo "Buenos Aires").
    if (debeFiltrarProvincia) {
      const provNorm = normalizarProvincia(provincia);
      filas = filas.filter(
        (jugador) =>
          normalizarProvincia(jugador.perfiles?.lugar_residencia) === provNorm,
      );
      // Aplicamos el limite original una vez filtrado en memoria.
      filas = filas.slice(0, limit);
    }

    // Deduplicar jugadores por usuario_id (tomando su categoria con mayor
    // puntuacion, que viene primera en el ordenamiento).
    const seenUsers = new Set<string>();
    const uniqueData: RowRanking[] = [];

    for (const jugador of filas) {
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
   * Ranking por provincias en torneos nacionales:
   * 8 campeón · 6 finalista · 4 semis · 2 cuartos · 1 octavos.
   */
  static async rankingProvincialPorTorneo(torneoId: string) {
    const { data: torneo, error: errorTorneo } = await supabaseAdmin
      .from("torneos")
      .select("alcance, configuracion_puntos")
      .eq("id", torneoId)
      .maybeSingle();

    if (errorTorneo) throw new Error(errorTorneo.message);
    if (!String(torneo?.alcance || "").toLowerCase().includes("nacional")) {
      return {
        torneoId,
        provincias: [] as Array<{
          provincia: string;
          puntos: number;
          parejas: number;
        }>,
      };
    }

    const configProvincia = leerConfigPuntosProvincia(
      torneo?.configuracion_puntos,
    );

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
      ]);

    if (error) throw new Error(error.message);

    const puntosPorInscripcion = puntosInscripcionPorMejorInstancia(
      (partidos || [])
        .filter((p) => p.ganador)
        .map((p) => ({
          ronda: String(p.ronda || ""),
          ganadorId: String(p.ganador),
          perdedorId:
            p.ganador === p.equipo_a_id
              ? p.equipo_b_id
              : p.equipo_a_id,
        })),
      configProvincia,
    );

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

    const provinciasPorInscripcion = new Map(
      (inscs || []).map((ins) => [
        ins.id as string,
        {
          provinciaA: provinciaDe(ins.perfiles),
          provinciaB: provinciaDe(ins.perfiles_j2),
        },
      ]),
    );
    const provincias = sumarPuntosPorProvincia(
      puntosPorInscripcion,
      provinciasPorInscripcion,
    );

    return { torneoId, provincias };
  }

  /**
   * Suma el ranking de provincias de todos los torneos nacionales
   * que coinciden con tipo, categoría y rama.
   */
  static async rankingProvincialNacional(filtros: {
    tipo: TipoRanking;
    categoria?: string | null;
    rama?: RamaRanking | null;
  }) {
    const { data, error } = await supabaseAdmin
      .from("torneos")
      .select("id, categoria, nivel, rama, alcance")
      .ilike("alcance", "%nacional%");

    if (error) throw new Error(error.message);

    const categoriaFiltro = (filtros.categoria || "").trim();
    const ids = (data || [])
      .filter((torneo) =>
        torneoNacionalCoincide(torneo, filtros.tipo, categoriaFiltro, filtros.rama),
      )
      .map((torneo) => torneo.id as string);

    const acumulado = new Map<
      string,
      { puntos: number; parejas: number; provincia: string }
    >();
    for (const id of ids) {
      const parcial = await RankingService.rankingProvincialPorTorneo(id);
      for (const fila of parcial.provincias) {
        const clave = normalizarProvincia(fila.provincia) || fila.provincia;
        const cur = acumulado.get(clave) || {
          puntos: 0,
          parejas: 0,
          provincia: fila.provincia,
        };
        cur.puntos += fila.puntos;
        cur.parejas += fila.parejas;
        acumulado.set(clave, cur);
      }
    }

    const provincias = [...acumulado.values()]
      .map((fila) => ({
        provincia: fila.provincia,
        puntos: Math.round(fila.puntos * 10) / 10,
        parejas: Math.round(fila.parejas * 10) / 10,
      }))
      .sort((a, b) => b.puntos - a.puntos);

    return { torneos: ids.length, provincias };
  }
}

function torneoNacionalCoincide(
  torneo: { categoria?: string | null; nivel?: string | null; rama?: string | null },
  tipo: TipoRanking,
  categoria: string,
  rama?: RamaRanking | null,
): boolean {
  const familia = (torneo.categoria || "").toLowerCase();
  const nivel = torneo.nivel || "";
  const libres = CATEGORIAS_LIBRES as readonly string[];
  const menores = CATEGORIAS_MENORES as readonly string[];
  const veteranos = CATEGORIAS_VETERANOS as readonly string[];

  const coincideTipo =
    tipo === "libres"
      ? familia.includes("libre") || libres.includes(nivel) || libres.includes(familia)
      : tipo === "menores"
        ? familia.includes("menor") || menores.includes(nivel)
        : familia.includes("veteran") ||
          familia.includes("lad") ||
          veteranos.includes(nivel);

  if (!coincideTipo) return false;
  if (categoria && nivel !== categoria && (torneo.categoria || "") !== categoria) {
    return false;
  }
  if (tipo === "menores" || !rama) return true;

  const valor = (torneo.rama || "").toLowerCase();
  if (rama === "masculino") {
    return valor.startsWith("masculin") || valor === "caballeros" || valor === "m";
  }
  return valor.startsWith("femenin") || valor.startsWith("dama") || valor.startsWith("lad");
}
