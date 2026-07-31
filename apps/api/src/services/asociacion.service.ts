import { supabaseAdmin } from "../config/supabase";

export interface AsociacionPayload {
  nombre: string;
  sigla?: string;
  tipo?: "asociacion" | "agrupacion" | "federacion";
  provincia: string;
  localidad: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  latitud?: number;
  longitud?: number;
  estado?: "activo" | "inactivo" | "pendiente";
  descripcion?: string;
  logo_url?: string;
}

export class AsociacionService {
  /**
   * Obtener todas las asociaciones registradas con métricas consolidadas
   */
  static async listarAsociaciones(params?: { search?: string; provincia?: string }) {
    let query = supabaseAdmin
      .from("asociaciones")
      .select("*")
      .order("nombre", { ascending: true });

    if (params?.provincia && params.provincia !== "Todas") {
      query = query.eq("provincia", params.provincia);
    }

    const { data: rawData, error } = await query;

    if (error) {
      console.error("[AsociacionService] Error al listar asociaciones:", error.message);
      return [];
    }

    let list = rawData || [];

    // Filtrar búsqueda si aplica
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (a: any) =>
          a.nombre?.toLowerCase().includes(q) ||
          a.sigla?.toLowerCase().includes(q) ||
          a.localidad?.toLowerCase().includes(q) ||
          a.provincia?.toLowerCase().includes(q),
      );
    }

    // Enriquecer con métricas reales
    const { data: clubes } = await supabaseAdmin
      .from("clubes")
      .select("id, provincia, nombre");

    const { data: torneos } = await supabaseAdmin
      .from("torneos")
      .select("id, club_id");

    const { data: perfiles } = await supabaseAdmin
      .from("perfiles")
      .select("id, club_id")
      .eq("rol", "usuario")
      .not("club_id", "is", null);

    return list.map((a: any) => {
      // Clubes de la misma provincia de la asociación
      const clubesAsoc = (clubes || []).filter(
        (c) => c.provincia?.toLowerCase().trim() === a.provincia?.toLowerCase().trim(),
      );
      const clubesIds = new Set(clubesAsoc.map((c) => c.id));

      // Torneos de esos clubes
      const torneosAsoc = (torneos || []).filter(
        (t) => t.club_id && clubesIds.has(t.club_id),
      );

      // Jugadores asignados a esos clubes (via club_id en perfiles)
      const jugadoresCount = (perfiles || []).filter(
        (p) => p.club_id && clubesIds.has(p.club_id),
      ).length;

      return {
        ...a,
        torneos_count: torneosAsoc.length,
        jugadores_count: jugadoresCount,
        clubes_count: clubesAsoc.length,
      };
    });
  }

  /**
   * Obtener torneos pertenecientes a una asociación (via sus clubes miembros)
   */
  static async obtenerTorneosPorAsociacion(asociacionId: string) {
    const asoc = await this.obtenerPorId(asociacionId);
    if (!asoc) return [];

    const { data: clubes } = await supabaseAdmin
      .from("clubes")
      .select("id, nombre")
      .ilike("provincia", `%${asoc.provincia}%`);

    if (!clubes || clubes.length === 0) return [];

    const clubesMapNombre = new Map<string, string>();
    clubes.forEach((c) => clubesMapNombre.set(c.id, c.nombre));
    const clubesIds = [...clubesMapNombre.keys()];

    const { data: torneos, error } = await supabaseAdmin
      .from("torneos")
      .select("id, nombre, fecha, estado, categoria, modalidad, nivel, logo_url, cupos_maximos, cupos_actuales, precio_inscripcion, club_id")
      .in("club_id", clubesIds)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("[AsociacionService] Error torneos:", error.message);
      return [];
    }

    // Enriquecer con nombre del club (evitando join ambiguo)
    return (torneos || []).map((t) => ({
      ...t,
      club_nombre: clubesMapNombre.get(t.club_id) || "Club",
    }));
  }

  /**
   * Obtener jugadores pertenecientes a una asociación y sus clubes afiliados.
   * Fuente de verdad: perfiles.club_id → clubes → asociaciones.
   */
  static async obtenerJugadoresPorAsociacion(asociacionId: string) {
    const asoc = await this.obtenerPorId(asociacionId);
    if (!asoc) return [];

    // 1. Clubes de esta provincia (afiliados a la asociación)
    const { data: clubes } = await supabaseAdmin
      .from("clubes")
      .select("id, nombre")
      .ilike("provincia", `%${asoc.provincia}%`);

    const clubesMap = new Map<string, string>(); // id → nombre
    (clubes || []).forEach((c) => clubesMap.set(c.id, c.nombre));
    const clubesIds = [...clubesMap.keys()];

    if (clubesIds.length === 0) return [];

    // 2. Perfiles pertenecientes directamente a estos clubes
    const { data: perfiles } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, dni, avatar_url, categoria_padel, lugar_residencia, club_id, sexo, fecha_nacimiento")
      .in("club_id", clubesIds);

    if (!perfiles || perfiles.length === 0) return [];
    const jugadoresIds = perfiles.map((p) => p.id);

    // 3. Obtener el ranking global para calcular la Posición y Puntos FAP oficiales reales coincidiendo con la Tabla General
    const { data: todosRankings } = await supabaseAdmin
      .from("rankings")
      .select("usuario_id, puntos, pj, pg, categoria, alcance")
      .order("puntos", { ascending: false });

    // Deduplicar seleccionando la entrada de mayor puntuación/categoría principal por usuario (misma regla de la Tabla General)
    const statsMap = new Map<string, { puntos: number; pj: number; pg: number; categoria: string }>();
    (todosRankings || []).forEach((r) => {
      if (!statsMap.has(r.usuario_id)) {
        statsMap.set(r.usuario_id, {
          puntos: r.puntos ?? 0,
          pj: r.pj ?? 0,
          pg: r.pg ?? 0,
          categoria: r.categoria || "5ª",
        });
      }
    });

    // Crear la Tabla Oficial de Ranking General FAP (ordenada de mayor a menor puntuación deduplicada)
    const rankingGlobalOrdenado = Array.from(statsMap.entries())
      .map(([usuarioId, st]) => ({ usuarioId, puntos: st.puntos }))
      .sort((a, b) => b.puntos - a.puntos);

    // Crear mapa de usuarioId -> Posición Global FAP (1-indexed)
    const posicionGlobalMap = new Map<string, number>();
    rankingGlobalOrdenado.forEach((item, index) => {
      if (item.puntos > 0) {
        posicionGlobalMap.set(item.usuarioId, index + 1);
      }
    });

    // Mapear jugadores de esta asociación asignando sus puntos y posición oficial real
    return perfiles.map((p) => {
      const st = statsMap.get(p.id);
      const clubNombre = (p.club_id && clubesMap.get(p.club_id)) || "Sin club";
      const posGlobal = posicionGlobalMap.get(p.id) ?? null;

      // Calcular edad si tiene fecha_nacimiento
      let edad: number | null = null;
      if (p.fecha_nacimiento) {
        const fn = new Date(p.fecha_nacimiento);
        const hoy = new Date();
        edad = hoy.getFullYear() - fn.getFullYear();
        const m = hoy.getMonth() - fn.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) {
          edad--;
        }
      }

      return {
        id: p.id,
        nombre: p.nombre || "Jugador",
        apellido: p.apellido || "",
        dni: p.dni || "N/D",
        avatar_url: p.avatar_url || null,
        categoria: p.categoria_padel || st?.categoria || "1ª",
        club: clubNombre,
        provincia: p.lugar_residencia || "Argentina",
        sexo: p.sexo || "masculino",
        fecha_nacimiento: p.fecha_nacimiento || null,
        edad: edad ?? 25,
        puntos: st?.puntos ?? 0,
        partidos_jugados: st?.pj ?? 0,
        partidos_ganados: st?.pg ?? 0,
        ranking: posGlobal,
      };
    });
  }

  /**
   * Obtener clubes pertenecientes a una asociación
   */
  static async obtenerClubes(asociacionId: string) {
    const asoc = await this.obtenerPorId(asociacionId);
    if (!asoc) return [];

    const { data: clubes, error } = await supabaseAdmin
      .from("clubes")
      .select("*")
      .ilike("provincia", `%${asoc.provincia}%`);

    if (error) {
      console.error("[AsociacionService] Error clubes:", error.message);
      return [];
    }

    return clubes || [];
  }

  /**
   * Obtener una asociación por ID
   */
  static async obtenerPorId(id: string) {
    const { data, error } = await supabaseAdmin
      .from("asociaciones")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[AsociacionService] Error obtenerPorId:", error.message);
      return null;
    }

    return data || null;
  }

  /**
   * Crear nueva asociación / agrupación
   */
  static async crearAsociacion(datos: AsociacionPayload) {
    const { data, error } = await supabaseAdmin
      .from("asociaciones")
      .insert([
        {
          nombre: datos.nombre,
          sigla: datos.sigla || datos.nombre.slice(0, 4).toUpperCase(),
          tipo: datos.tipo || "asociacion",
          provincia: datos.provincia,
          localidad: datos.localidad,
          direccion: datos.direccion || "",
          telefono: datos.telefono || "",
          email: datos.email || "",
          latitud: datos.latitud || null,
          longitud: datos.longitud || null,
          estado: datos.estado || "activo",
          descripcion: datos.descripcion || "",
          logo_url: datos.logo_url || null,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear asociación: ${error.message}`);
    return data;
  }

  /**
   * Editar asociación existente
   */
  static async actualizarAsociacion(id: string, datos: Partial<AsociacionPayload>) {
    const updates: Record<string, any> = {};
    if (datos.nombre !== undefined) updates.nombre = datos.nombre;
    if (datos.sigla !== undefined) updates.sigla = datos.sigla;
    if (datos.tipo !== undefined) updates.tipo = datos.tipo;
    if (datos.provincia !== undefined) updates.provincia = datos.provincia;
    if (datos.localidad !== undefined) updates.localidad = datos.localidad;
    if (datos.direccion !== undefined) updates.direccion = datos.direccion;
    if (datos.telefono !== undefined) updates.telefono = datos.telefono;
    if (datos.email !== undefined) updates.email = datos.email;
    if (datos.latitud !== undefined) updates.latitud = datos.latitud;
    if (datos.longitud !== undefined) updates.longitud = datos.longitud;
    if (datos.descripcion !== undefined) updates.descripcion = datos.descripcion;
    if (datos.logo_url !== undefined) updates.logo_url = datos.logo_url;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("asociaciones")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar asociación: ${error.message}`);
    return data;
  }

  /**
   * Cambiar estado de activación de la asociación (Habilitar / Inhabilitar)
   */
  static async cambiarEstado(id: string, estado: "activo" | "inactivo" | "pendiente") {
    const { data, error } = await supabaseAdmin
      .from("asociaciones")
      .update({ estado, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al cambiar estado de la asociación: ${error.message}`);
    return data;
  }
}
