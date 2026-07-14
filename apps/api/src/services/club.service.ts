import { supabase, supabaseAdmin } from "../config/supabase";

export interface CrearClubDTO {
  nombre: string;
  provincia: string;
  localidad: string;
  canchas: number;
  estado?: string;
  latitud?: number | null;
  longitud?: number | null;
  cbu?: string | null;
  alias?: string | null;
}

export type ActualizarClubDTO = Partial<CrearClubDTO>;

export interface ClubCercano {
  id: string;
  nombre: string;
  provincia: string;
  localidad: string;
  canchas: number;
  estado: string;
  latitud: number;
  longitud: number;
  distancia_km: number;
}

export class ClubService {
  /**
   * Busca clubes cercanos a una coordenada dada usando la función RPC de Haversine.
   */
  static async buscarCercanos(
    lat: number,
    lng: number,
    radioKm: number = 50,
  ): Promise<ClubCercano[]> {
    const { data, error } = await supabaseAdmin.rpc("buscar_clubes_cercanos", {
      user_lat: lat,
      user_lng: lng,
      max_distancia_km: radioKm,
    });

    if (error) throw new Error(`Error en búsqueda geográfica: ${error.message}`);
    return (data as ClubCercano[]) || [];
  }

  static async obtenerClubesPaginados(
    page: number,
    limit: number,
    search?: string,
    provincia?: string,
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("clubes")
      .select(`*, torneos(count), canchas(count)`, { count: "exact" })
      .range(from, to);

    if (search) query = query.ilike("nombre", `%${search}%`);
    if (provincia) query = query.eq("provincia", provincia);

    const { data, error, count } = await query;
    if (error) throw new Error("Error interno al obtener los clubes.");

    // Tipado seguro para la respuesta de Supabase
    type SupabaseClub = Record<string, any> & {
      torneos?: { count: number }[] | null;
      canchas?: { count: number }[] | null;
    };

    const formattedData = ((data as SupabaseClub[]) || []).map((club) => {
      // Extraemos la cuenta de torneos y canchas de forma segura
      const torneosCount =
        club.torneos && club.torneos.length > 0 ? club.torneos[0].count : 0;
      const canchasCount =
        club.canchas && club.canchas.length > 0 ? club.canchas[0].count : 0;

      // Eliminamos los arrays crudos para limpiar la respuesta
      const { torneos, canchas, ...restoClub } = club;

      return {
        ...restoClub,
        canchas: canchasCount || restoClub.canchas || 0, // Fallback al conteo estático si el conteo real es 0
        torneos_count: torneosCount,
      };
    });

    return { data: formattedData, total: count };
  }

  static async obtenerClubPorId(id: string) {
    const { data, error } = await supabaseAdmin
      .from("clubes")
      .select(`*, torneos(*), canchas(count)`)
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("Club no encontrado.");

    type SupabaseClubDetalle = Record<string, any> & {
      canchas?: { count: number }[] | null;
    };

    const d = data as SupabaseClubDetalle;
    const canchasCount = d.canchas && d.canchas.length > 0 ? d.canchas[0].count : 0;
    const { canchas, ...resto } = d;

    return {
      ...resto,
      canchas: canchasCount || resto.canchas || 0,
    };
  }

  static async crearClub(datos: CrearClubDTO) {
    const { data, error } = await supabaseAdmin
      .from("clubes")
      .insert([
        {
          ...datos,
          canchas: Number(datos.canchas) || 0,
          estado: datos.estado || "Activo",
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear el club: ${error.message}`);
    return data;
  }

  static async actualizarClub(id: string, datos: ActualizarClubDTO) {
    const payload = { ...datos };
    if (payload.canchas !== undefined) {
      payload.canchas = Number(payload.canchas) || 0;
    }

    const { data, error } = await supabaseAdmin
      .from("clubes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar el club: ${error.message}`);
    return data;
  }

  static async desactivarClub(id: string) {
    const { error } = await supabaseAdmin
      .from("clubes")
      .update({ estado: "Inactivo" })
      .eq("id", id);

    if (error) throw new Error("Error interno al intentar desactivar el club.");
  }

  // ── Canchas CRUD ──────────────────────────────────────────────────────

  static async obtenerCanchasPorClub(clubId: string) {
    // Trae las canchas con sus turnos asociados
    const { data, error } = await supabaseAdmin
      .from("canchas")
      .select("*, turnos(*)")
      .eq("club_id", clubId);

    if (error) throw new Error("Error al obtener las canchas del club.");
    return data || [];
  }

  static async crearCancha(clubId: string, datos: { nombre: string; tipo_suelo: string; techada: boolean }) {
    const { data, error } = await supabaseAdmin
      .from("canchas")
      .insert([
        {
          club_id: clubId,
          nombre: datos.nombre,
          tipo_suelo: datos.tipo_suelo || null,
          techada: datos.techada,
          activa: true,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear la cancha: ${error.message}`);
    return data;
  }

  static async actualizarCancha(canchaId: string, datos: { nombre?: string; tipo_suelo?: string; techada?: boolean; activa?: boolean }) {
    const { data, error } = await supabaseAdmin
      .from("canchas")
      .update(datos)
      .eq("id", canchaId)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar la cancha: ${error.message}`);
    return data;
  }

  static async eliminarCancha(canchaId: string) {
    const { error } = await supabaseAdmin
      .from("canchas")
      .delete()
      .eq("id", canchaId);

    if (error) throw new Error(`Error al eliminar la cancha: ${error.message}`);
  }

  // ── Turnos CRUD ───────────────────────────────────────────────────────

  static async crearTurno(canchaId: string, datos: { hora_inicio: string; hora_fin: string; precio: number; dia_semana: number }) {
    const { data, error } = await supabaseAdmin
      .from("turnos")
      .insert([
        {
          cancha_id: canchaId,
          hora_inicio: datos.hora_inicio,
          hora_fin: datos.hora_fin,
          precio: Number(datos.precio),
          dia_semana: Number(datos.dia_semana),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear el turno: ${error.message}`);
    return data;
  }
  static async eliminarTurno(turnoId: string) {
    const { error } = await supabaseAdmin
      .from("turnos")
      .delete()
      .eq("id", turnoId);

    if (error) throw new Error(`Error al eliminar el turno: ${error.message}`);
  }

  // ── Métodos para Panel de Club ────────────────────────────────────────

  static async obtenerClubPorUsuario(usuarioId: string) {
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .select("club_id")
      .eq("id", usuarioId)
      .single();

    if (perfilError || !perfil || !perfil.club_id) {
      throw new Error("El usuario no tiene un club asignado.");
    }

    return this.obtenerClubPorId(perfil.club_id);
  }

  static async obtenerEstadisticasClub(clubId: string) {
    // 1. Obtener canchas del club
    const { data: canchas } = await supabaseAdmin
      .from("canchas")
      .select("id, activa")
      .eq("club_id", clubId);

    const canchaIds = (canchas || []).map((c) => c.id);
    const canchasActivas = (canchas || []).filter((c) => c.activa).length;

    if (canchaIds.length === 0) {
      return {
        canchas_totales: 0,
        canchas_activas: 0,
        reservas_mes: 0,
        ingresos_estimados: 0,
        tasa_ocupacion: 0,
      };
    }

    // 2. Obtener turnos asociados a esas canchas
    const { data: turnos } = await supabaseAdmin
      .from("turnos")
      .select("id")
      .in("cancha_id", canchaIds);

    const turnoIds = (turnos || []).map((t) => t.id);

    if (turnoIds.length === 0) {
      return {
        canchas_totales: canchaIds.length,
        canchas_activas: canchasActivas,
        reservas_mes: 0,
        ingresos_estimados: 0,
        tasa_ocupacion: 0,
      };
    }

    // 3. Reservas del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { data: reservas } = await supabaseAdmin
      .from("reservas")
      .select("id, turno_id, estado_pago, turnos(precio)")
      .in("turno_id", turnoIds)
      .gte("fecha_reserva", inicioMes.toISOString().split("T")[0]);

    const reservasMes = (reservas || []).length;

    // Calcular ingresos estimados del mes (precio de las reservas confirmadas/completadas o todas)
    const ingresosEstimados = (reservas || []).reduce((acc, res) => {
      const precio = (res.turnos as any)?.precio || 0;
      return acc + Number(precio);
    }, 0);

    // Calcular tasa de ocupación aproximada: reservas realizadas / turnos totales disponibles en el mes
    const diasTranscurridos = new Date().getDate();
    const turnosTotalesDisponibles = turnoIds.length * diasTranscurridos;
    const tasaOcupacion = turnosTotalesDisponibles > 0 
      ? Math.round((reservasMes / turnosTotalesDisponibles) * 100) 
      : 0;

    return {
      canchas_totales: canchaIds.length,
      canchas_activas: canchasActivas,
      reservas_mes: reservasMes,
      ingresos_estimados: ingresosEstimados,
      tasa_ocupacion: Math.min(tasaOcupacion, 100),
    };
  }

  static async obtenerReservasClub(
    clubId: string,
    filtros: { fecha?: string; estado_pago?: string; cancha_id?: string; page?: number; limit?: number },
  ) {
    const { fecha, estado_pago, cancha_id, page = 1, limit = 20 } = filtros;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Obtener canchas del club para filtrar
    const { data: canchas } = await supabaseAdmin
      .from("canchas")
      .select("id")
      .eq("club_id", clubId);

    const canchaIds = (canchas || []).map((c) => c.id);

    if (canchaIds.length === 0) {
      return { data: [], total: 0 };
    }

    // Armar la consulta
    let query = supabaseAdmin
      .from("reservas")
      .select(
        `
        id,
        fecha_reserva,
        estado_pago,
        estado_reserva,
        created_at,
        perfiles(id, nombre, apellido, email, telefono),
        turnos(
          id,
          hora_inicio,
          hora_fin,
          precio,
          canchas(id, nombre)
        )
      `,
        { count: "exact" },
      );

    // Filtrar por los turnos de las canchas del club
    if (cancha_id) {
      // Si se filtra por cancha específica del club
      const { data: turnosCancha } = await supabaseAdmin
        .from("turnos")
        .select("id")
        .eq("cancha_id", cancha_id);
      const tcIds = (turnosCancha || []).map((t) => t.id);
      query = query.in("turno_id", tcIds.length > 0 ? tcIds : ["00000000-0000-0000-0000-000000000000"]);
    } else {
      // Todos los turnos de todas las canchas del club
      const { data: turnosClub } = await supabaseAdmin
        .from("turnos")
        .select("id")
        .in("cancha_id", canchaIds);
      const tcIds = (turnosClub || []).map((t) => t.id);
      query = query.in("turno_id", tcIds.length > 0 ? tcIds : ["00000000-0000-0000-0000-000000000000"]);
    }

    if (fecha) query = query.eq("fecha_reserva", fecha);
    if (estado_pago) query = query.eq("estado_pago", estado_pago);

    query = query.order("fecha_reserva", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error("Error al obtener reservas del club: " + error.message);

    return { data: data || [], total: count || 0 };
  }
}

