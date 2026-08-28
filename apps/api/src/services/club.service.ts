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
  latitud: number | null;
  longitud: number | null;
  distancia_km: number | null;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatearClubConCanchas(
  club: Record<string, unknown>,
): Record<string, unknown> & { canchas: number } {
  const canchasRel = club.canchas as { count: number }[] | null | undefined;
  const canchasCount =
    canchasRel && canchasRel.length > 0 ? canchasRel[0].count : 0;
  const { canchas: _canchas, torneos: _torneos, ...restoClub } = club;
  return {
    ...restoClub,
    canchas: canchasCount || Number(club.canchas) || 0,
  };
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

    if (error)
      throw new Error(`Error en búsqueda geográfica: ${error.message}`);
    return (data as ClubCercano[]) || [];
  }

  /**
   * Lista todos los clubes y, si hay coordenadas del usuario, calcula distancia
   * y ordena del más cercano al más lejano. Los clubes sin ubicación quedan al final.
   */
  static async listarTodosConDistancia(
    lat?: number,
    lng?: number,
    search?: string,
  ): Promise<ClubCercano[]> {
    let query = supabaseAdmin.from("clubes").select("*, canchas(count)");

    if (search?.trim()) {
      query = query.ilike("nombre", `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error("Error interno al obtener los clubes.");

    const clubes = ((data as Record<string, unknown>[]) || []).map(
      formatearClubConCanchas,
    );

    const conDistancia: ClubCercano[] = clubes.map((club) => {
      const latitud =
        club.latitud == null ? null : Number(club.latitud as number);
      const longitud =
        club.longitud == null ? null : Number(club.longitud as number);

      const distancia_km =
        lat != null &&
        lng != null &&
        latitud != null &&
        longitud != null &&
        !Number.isNaN(latitud) &&
        !Number.isNaN(longitud)
          ? Number(
              haversineKm(lat, lng, latitud, longitud).toFixed(2),
            )
          : null;

      return {
        id: String(club.id),
        nombre: String(club.nombre ?? ""),
        provincia: String(club.provincia ?? ""),
        localidad: String(club.localidad ?? ""),
        canchas: Number(club.canchas ?? 0),
        estado: String(club.estado ?? "Activo"),
        latitud,
        longitud,
        distancia_km,
      };
    });

    return conDistancia.sort((a, b) => {
      if (a.distancia_km == null && b.distancia_km == null) {
        return a.nombre.localeCompare(b.nombre, "es");
      }
      if (a.distancia_km == null) return 1;
      if (b.distancia_km == null) return -1;
      if (a.distancia_km !== b.distancia_km) {
        return a.distancia_km - b.distancia_km;
      }
      return a.nombre.localeCompare(b.nombre, "es");
    });
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
      .select(`*, torneos!club_id(count), canchas(count)`, { count: "exact" })
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
      .select(`*, torneos!club_id(*), canchas(count)`)
      .eq("id", id)
      .single();

    if (error || !data)
      throw new Error("Club no encontrado o error en consulta.");

    type SupabaseClubDetalle = Record<string, any> & {
      canchas?: { count: number }[] | null;
    };

    const d = data as SupabaseClubDetalle;
    const canchasCount =
      d.canchas && d.canchas.length > 0 ? d.canchas[0].count : 0;
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

  static async crearCancha(
    clubId: string,
    datos: { nombre: string; tipo_suelo: string; techada: boolean },
  ) {
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

  static async actualizarCancha(
    canchaId: string,
    datos: {
      nombre?: string;
      tipo_suelo?: string;
      techada?: boolean;
      activa?: boolean;
    },
  ) {
    const { data, error } = await supabaseAdmin
      .from("canchas")
      .update(datos)
      .eq("id", canchaId)
      .select()
      .single();

    if (error)
      throw new Error(`Error al actualizar la cancha: ${error.message}`);
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

  static async crearTurno(
    canchaId: string,
    datos: {
      hora_inicio: string;
      hora_fin: string;
      precio: number;
      dia_semana: number;
    },
  ) {
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
    const tasaOcupacion =
      turnosTotalesDisponibles > 0
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
    filtros: {
      fecha?: string;
      estado_pago?: string;
      cancha_id?: string;
      page?: number;
      limit?: number;
    },
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
    let query = supabaseAdmin.from("reservas").select(
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
      query = query.in(
        "turno_id",
        tcIds.length > 0 ? tcIds : ["00000000-0000-0000-0000-000000000000"],
      );
    } else {
      // Todos los turnos de todas las canchas del club
      const { data: turnosClub } = await supabaseAdmin
        .from("turnos")
        .select("id")
        .in("cancha_id", canchaIds);
      const tcIds = (turnosClub || []).map((t) => t.id);
      query = query.in(
        "turno_id",
        tcIds.length > 0 ? tcIds : ["00000000-0000-0000-0000-000000000000"],
      );
    }

    if (fecha) query = query.eq("fecha_reserva", fecha);
    if (estado_pago) query = query.eq("estado_pago", estado_pago);

    query = query.order("fecha_reserva", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error)
      throw new Error("Error al obtener reservas del club: " + error.message);

    return { data: data || [], total: count || 0 };
  }

  /**
   * Ajuste masivo de precios de turnos del club (% o monto fijo).
   * franja: todos | pico (>=18:00) | valle (<18:00)
   */
  static async ajustarPreciosMasivos(
    clubId: string,
    opciones: {
      cancha_id?: string | null;
      tipo_ajuste: "porcentaje" | "fijo";
      valor: number;
      franja?: "todos" | "pico" | "valle";
    },
  ) {
    const { data: canchas, error: errCanchas } = await supabaseAdmin
      .from("canchas")
      .select("id")
      .eq("club_id", clubId);

    if (errCanchas) throw new Error(errCanchas.message);
    const canchaIds = (canchas || []).map((c) => c.id);
    if (canchaIds.length === 0) {
      return { actualizados: 0 };
    }

    const targetCanchaIds = opciones.cancha_id
      ? canchaIds.filter((id) => id === opciones.cancha_id)
      : canchaIds;

    if (targetCanchaIds.length === 0) {
      throw new Error("La cancha indicada no pertenece a este club.");
    }

    const { data: turnos, error: errTurnos } = await supabaseAdmin
      .from("turnos")
      .select("id, precio, hora_inicio, cancha_id")
      .in("cancha_id", targetCanchaIds);

    if (errTurnos) throw new Error(errTurnos.message);

    const franja = opciones.franja || "todos";
    const filtrados = (turnos || []).filter((t) => {
      const hora = String(t.hora_inicio || "").slice(0, 5);
      if (franja === "pico") return hora >= "18:00";
      if (franja === "valle") return hora < "18:00";
      return true;
    });

    if (filtrados.length === 0) {
      return { actualizados: 0 };
    }

    const updates = filtrados.map((t) => {
      const actual = Number(t.precio) || 0;
      let nuevo =
        opciones.tipo_ajuste === "porcentaje"
          ? Math.round(actual * (1 + opciones.valor / 100))
          : Math.round(actual + opciones.valor);
      if (nuevo < 0) nuevo = 0;
      return { id: t.id, precio: nuevo };
    });

    let actualizados = 0;
    for (const u of updates) {
      const { error } = await supabaseAdmin
        .from("turnos")
        .update({ precio: u.precio })
        .eq("id", u.id);
      if (error) throw new Error(error.message);
      actualizados += 1;
    }

    return { actualizados };
  }

  /**
   * Crea una plantilla de turnos (varios horarios × días) en una o más canchas del club.
   * Omite combinaciones que ya existen (misma cancha, día y hora de inicio).
   */
  static async crearTurnosPlantilla(
    clubId: string,
    opciones: {
      cancha_ids: string[];
      dias: number[];
      slots: Array<{ hora_inicio: string; hora_fin: string; precio: number }>;
    },
  ) {
    const dias = [...new Set(opciones.dias)].filter(
      (d) => Number.isInteger(d) && d >= 0 && d <= 6,
    );
    if (dias.length === 0) {
      throw new Error("Seleccioná al menos un día de la semana.");
    }

    const normalizeTime = (raw: string) => {
      const v = String(raw || "").trim();
      const m = v.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) throw new Error(`Horario inválido: ${raw}`);
      const hh = String(Number(m[1])).padStart(2, "0");
      const mm = m[2];
      const ss = m[3] || "00";
      return `${hh}:${mm}:${ss}`;
    };

    const toMinutes = (t: string) => {
      const [hh, mm] = t.split(":").map(Number);
      return hh * 60 + mm;
    };

    const slots = opciones.slots.map((s) => {
      const hora_inicio = normalizeTime(s.hora_inicio);
      const hora_fin = normalizeTime(s.hora_fin);
      const precio = Number(s.precio);
      if (!Number.isFinite(precio) || precio < 0) {
        throw new Error("Cada turno debe tener un precio válido.");
      }
      if (toMinutes(hora_fin) <= toMinutes(hora_inicio)) {
        throw new Error(
          `La hora de fin debe ser posterior al inicio (${hora_inicio.slice(0, 5)}).`,
        );
      }
      return { hora_inicio, hora_fin, precio: Math.round(precio) };
    });

    if (slots.length === 0) {
      throw new Error("Agregá al menos un horario (ej. 08:00 a 09:30).");
    }

    const sorted = [...slots].sort(
      (a, b) => toMinutes(a.hora_inicio) - toMinutes(b.hora_inicio),
    );
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].hora_inicio) < toMinutes(sorted[i - 1].hora_fin)) {
        throw new Error(
          "Hay horarios superpuestos en la plantilla. Ajustalos antes de aplicar.",
        );
      }
    }

    const { data: canchas, error: errCanchas } = await supabaseAdmin
      .from("canchas")
      .select("id")
      .eq("club_id", clubId);

    if (errCanchas) throw new Error(errCanchas.message);
    const clubCanchaIds = new Set((canchas || []).map((c) => c.id));
    if (clubCanchaIds.size === 0) {
      throw new Error("El club no tiene canchas.");
    }

    const requested = [...new Set(opciones.cancha_ids.filter(Boolean))];
    if (requested.length === 0) {
      throw new Error("Seleccioná al menos una cancha.");
    }

    const targetCanchaIds = requested.filter((id) => clubCanchaIds.has(id));
    if (targetCanchaIds.length === 0) {
      throw new Error("Las canchas indicadas no pertenecen a este club.");
    }
    if (targetCanchaIds.length !== requested.length) {
      throw new Error("Alguna cancha no pertenece a este club.");
    }

    const { data: existentes, error: errExist } = await supabaseAdmin
      .from("turnos")
      .select("cancha_id, dia_semana, hora_inicio")
      .in("cancha_id", targetCanchaIds);

    if (errExist) throw new Error(errExist.message);

    const existingKeys = new Set(
      (existentes || []).map(
        (t) =>
          `${t.cancha_id}|${t.dia_semana}|${String(t.hora_inicio).slice(0, 5)}`,
      ),
    );

    const rows: Array<{
      cancha_id: string;
      hora_inicio: string;
      hora_fin: string;
      precio: number;
      dia_semana: number;
    }> = [];

    for (const canchaId of targetCanchaIds) {
      for (const dia of dias) {
        for (const slot of slots) {
          const key = `${canchaId}|${dia}|${slot.hora_inicio.slice(0, 5)}`;
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);
          rows.push({
            cancha_id: canchaId,
            hora_inicio: slot.hora_inicio,
            hora_fin: slot.hora_fin,
            precio: slot.precio,
            dia_semana: dia,
          });
        }
      }
    }

    if (rows.length === 0) {
      return { creados: 0, omitidos: targetCanchaIds.length * dias.length * slots.length };
    }

    const chunkSize = 200;
    let creados = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin.from("turnos").insert(chunk);
      if (error) throw new Error(`Error al crear turnos: ${error.message}`);
      creados += chunk.length;
    }

    const totalPosibles = targetCanchaIds.length * dias.length * slots.length;
    return { creados, omitidos: totalPosibles - creados };
  }
}
