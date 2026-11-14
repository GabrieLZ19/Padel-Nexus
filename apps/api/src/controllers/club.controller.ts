import { NextFunction, Request, Response } from "express";
import { ClubService } from "../services/club.service";
import { AlcanceCuentaService } from "../services/alcanceCuenta.service";
import { mismaProvincia } from "../utils/alcanceCuenta";
import type { FiltrosListadoClubesReserva } from "../utils/filtrosClubReserva";
import type { CuentaResuelta } from "../services/alcanceCuenta.service";

const ROLES_GESTION_CLUB = new Set([
  "superadmin",
  "admin",
  "admin_federacion",
  "admin_provincial",
  "admin_club",
]);

function puedeVerClubNoAdherido(
  cuenta: CuentaResuelta,
  club: {
    id?: string;
    es_adherido?: boolean;
    creado_por_club_id?: string | null;
  },
  clubId: string,
): boolean {
  if (club.es_adherido !== false) return true;
  if (!ROLES_GESTION_CLUB.has(cuenta.rol)) return false;
  if (
    cuenta.rol === "superadmin" ||
    cuenta.rol === "admin" ||
    cuenta.rol === "admin_federacion" ||
    cuenta.rol === "admin_provincial"
  ) {
    return true;
  }
  if (cuenta.rol === "admin_club" && cuenta.clubId) {
    return (
      clubId === cuenta.clubId || club.creado_por_club_id === cuenta.clubId
    );
  }
  return false;
}

function parseFiltrosReservaClub(query: Request["query"]): FiltrosListadoClubesReserva {
  const search = typeof query.search === "string" ? query.search : undefined;
  const provincia =
    typeof query.provincia === "string" ? query.provincia : undefined;
  const tipo_suelo =
    typeof query.tipo_suelo === "string" ? query.tipo_suelo : undefined;

  let max_distancia_km: number | undefined;
  if (query.max_distancia_km != null && String(query.max_distancia_km).trim()) {
    const n = parseFloat(String(query.max_distancia_km));
    if (!Number.isNaN(n) && n > 0) max_distancia_km = n;
  }

  let techada: boolean | undefined;
  if (query.techada === "1" || query.techada === "true") techada = true;
  if (query.techada === "0" || query.techada === "false") techada = false;

  const fecha_disponibilidad =
    typeof query.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.fecha)
      ? query.fecha
      : undefined;
  const hora_disponibilidad =
    typeof query.hora === "string" && /^\d{1,2}:\d{2}/.test(query.hora)
      ? query.hora.slice(0, 5)
      : undefined;

  return {
    search,
    provincia,
    max_distancia_km,
    tipo_suelo,
    techada,
    fecha_disponibilidad,
    hora_disponibilidad,
  };
}

export async function limitarClubAProvincia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const clubId = typeof req.params.id === "string" ? req.params.id : "";
  if (!clubId) {
    next();
    return;
  }
  const cuenta = await AlcanceCuentaService.resolver(req.user);
  if (cuenta.rol !== "admin_provincial") {
    next();
    return;
  }
  if (!cuenta.provincia) {
    res.status(403).json({ message: cuenta.aviso });
    return;
  }
  const ids = await AlcanceCuentaService.idsClubesDeProvincia(cuenta.provincia);
  if (!ids.includes(clubId)) {
    res.status(403).json({ message: "Este club no es de tu provincia." });
    return;
  }
  next();
}

export const getAllClubes = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      provincia,
      lat,
      lng,
      ordenar,
    } = req.query;

    // Listado completo ordenado por cercanía (sin filtrar por radio)
    if (lat && lng) {
      const latNum = parseFloat(lat as string);
      const lngNum = parseFloat(lng as string);

      if (isNaN(latNum) || isNaN(lngNum)) {
        return res
          .status(400)
          .json({ exito: false, error: "Coordenadas inválidas." });
      }

      const filtros = parseFiltrosReservaClub(req.query);
      const data = await ClubService.listarTodosConDistancia(
        latNum,
        lngNum,
        filtros,
      );
      return res.status(200).json({ exito: true, data, total: data.length });
    }

    if (ordenar === "distancia") {
      const filtros = parseFiltrosReservaClub(req.query);
      const data = await ClubService.listarTodosConDistancia(
        undefined,
        undefined,
        filtros,
      );
      return res.status(200).json({ exito: true, data, total: data.length });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const cuenta = await AlcanceCuentaService.resolver(req.user);
    let provinciaFiltro = provincia as string | undefined;
    let clubIds: string[] | undefined;

    if (cuenta.rol === "admin_provincial") {
      if (!cuenta.provincia) {
        return res.status(200).json({
          exito: true,
          data: [],
          total: 0,
          aviso: cuenta.aviso,
        });
      }
      if (
        provinciaFiltro &&
        !mismaProvincia(provinciaFiltro, cuenta.provincia)
      ) {
        return res.status(200).json({ exito: true, data: [], total: 0 });
      }
      clubIds = await AlcanceCuentaService.idsClubesDeProvincia(cuenta.provincia);
      provinciaFiltro = undefined;
    }

    const resultado = await ClubService.obtenerClubesPaginados(
      pageNum,
      limitNum,
      search as string | undefined,
      provinciaFiltro,
      clubIds,
    );

    return res.status(200).json({ exito: true, ...resultado, aviso: cuenta.aviso });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const getClubById = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ exito: false, error: "ID del club requerido." });

    const cuenta = await AlcanceCuentaService.resolver(req.user);
    const data = await ClubService.obtenerClubPorId(id);
    if (
      !puedeVerClubNoAdherido(
        cuenta,
        data as {
          id?: string;
          es_adherido?: boolean;
          creado_por_club_id?: string | null;
        },
        id,
      )
    ) {
      return res.status(404).json({
        exito: false,
        error: "Club no encontrado.",
        message: "Club no encontrado.",
      });
    }
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(404).json({ exito: false, error: message, message });
  }
};

export const createClub = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const {
      nombre,
      provincia,
      localidad,
      direccion,
      codigo_postal,
      telefono,
      canchas,
      estado,
      latitud,
      longitud,
      cbu,
      alias,
      asociacion_id,
      suscripcion_sin_comisiones,
      pago_transferencia_habilitado,
      pago_efectivo_habilitado,
    } = req.body;

    if (!nombre || !provincia) {
      return res
        .status(400)
        .json({ exito: false, error: "Nombre y provincia son obligatorios." });
    }

    const cuenta = await AlcanceCuentaService.resolver(req.user);

    if (cuenta.rol === "admin_club") {
      if (!cuenta.clubId) {
        return res.status(403).json({
          exito: false,
          error: cuenta.aviso || "Tu perfil no tiene club asignado.",
          message: cuenta.aviso || "Tu perfil no tiene club asignado.",
        });
      }
      if (Boolean(suscripcion_sin_comisiones)) {
        return res.status(400).json({
          exito: false,
          error:
            "Las sedes registradas no pueden activar suscripción ni reservas públicas.",
          message:
            "Las sedes registradas no pueden activar suscripción ni reservas públicas.",
        });
      }
      const data = await ClubService.crearClub(
        {
          nombre,
          provincia,
          localidad,
          direccion: direccion || null,
          codigo_postal: codigo_postal || null,
          telefono: telefono || null,
          canchas,
          estado: estado || "Activo",
          latitud: latitud ?? null,
          longitud: longitud ?? null,
          cbu: cbu || null,
          alias: alias || null,
        },
        { modo: "sede_admin_club", clubPadreId: cuenta.clubId },
      );
      return res.status(201).json({ exito: true, data });
    }

    const data = await ClubService.crearClub({
      nombre,
      provincia,
      localidad,
      direccion: direccion || null,
      codigo_postal: codigo_postal || null,
      telefono: telefono || null,
      canchas,
      estado,
      latitud: latitud ?? null,
      longitud: longitud ?? null,
      cbu: cbu || null,
      alias: alias || null,
      asociacion_id: asociacion_id || null,
      suscripcion_sin_comisiones: Boolean(suscripcion_sin_comisiones),
      pago_transferencia_habilitado: Boolean(pago_transferencia_habilitado),
      pago_efectivo_habilitado: Boolean(pago_efectivo_habilitado),
      es_adherido: true,
    });
    return res.status(201).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ exito: false, error: message, message });
  }
};

export const promoverClubAdherido = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        exito: false,
        error: "ID del club requerido.",
        message: "ID del club requerido.",
      });
    }

    const data = await ClubService.promoverClubAAdherido(id);
    return res.status(200).json({
      exito: true,
      data,
      message: "El club pasó a la red de reservas como adherido.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ exito: false, error: message, message });
  }
};

export const updateClub = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const {
      nombre,
      provincia,
      localidad,
      direccion,
      codigo_postal,
      telefono,
      estado,
      canchas,
      latitud,
      longitud,
      cbu,
      alias,
      asociacion_id,
      suscripcion_sin_comisiones,
      pago_transferencia_habilitado,
      pago_efectivo_habilitado,
    } = req.body;

    if (!id)
      return res
        .status(400)
        .json({ exito: false, error: "ID del club requerido." });

    const data = await ClubService.actualizarClub(id, {
      nombre,
      provincia,
      localidad,
      direccion,
      codigo_postal,
      telefono,
      estado,
      canchas,
      latitud,
      longitud,
      cbu,
      alias,
      asociacion_id,
      ...(typeof suscripcion_sin_comisiones === "boolean"
        ? { suscripcion_sin_comisiones }
        : {}),
      ...(typeof pago_transferencia_habilitado === "boolean"
        ? { pago_transferencia_habilitado }
        : {}),
      ...(typeof pago_efectivo_habilitado === "boolean"
        ? { pago_efectivo_habilitado }
        : {}),
    });
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ exito: false, error: message });
  }
};

export const deleteClub = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ exito: false, error: "ID del club requerido." });

    await ClubService.desactivarClub(id);
    return res
      .status(200)
      .json({ exito: true, message: "Club desactivado correctamente." });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

// ── Canchas Controladores ──────────────────────────────────────────────

export const getCanchasPorClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // clubId
    const data = await ClubService.obtenerCanchasPorClub(id);
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const createCancha = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // clubId
    const { nombre, tipo_suelo, techada } = req.body;

    if (!nombre) {
      return res
        .status(400)
        .json({ exito: false, error: "El nombre es obligatorio." });
    }

    const data = await ClubService.crearCancha(id, {
      nombre,
      tipo_suelo,
      techada,
    });
    return res.status(201).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const updateCancha = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // canchaId
    const { nombre, tipo_suelo, techada, activa } = req.body;

    const data = await ClubService.actualizarCancha(id, {
      nombre,
      tipo_suelo,
      techada,
      activa,
    });
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const deleteCancha = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // canchaId
    await ClubService.eliminarCancha(id);
    return res
      .status(200)
      .json({ exito: true, message: "Cancha eliminada correctamente." });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

// ── Turnos Controladores ───────────────────────────────────────────────

export const createTurno = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // canchaId
    const { hora_inicio, hora_fin, precio, dia_semana } = req.body;

    if (!hora_inicio || !hora_fin || !precio || dia_semana === undefined) {
      return res
        .status(400)
        .json({
          exito: false,
          error: "Todos los campos de turno son obligatorios.",
        });
    }

    const data = await ClubService.crearTurno(id, {
      hora_inicio,
      hora_fin,
      precio,
      dia_semana,
    });
    return res.status(201).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const deleteTurno = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // turnoId
    await ClubService.eliminarTurno(id);
    return res
      .status(200)
      .json({ exito: true, message: "Turno eliminado correctamente." });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

// ── Bloqueos de disponibilidad ─────────────────────────────────────────

export const listarBloqueosClub = async (req: Request, res: Response) => {
  try {
    const clubId = String(req.params.id || "");
    const data = await ClubService.listarBloqueos(clubId, {
      soloActivos: req.query.todos !== "1",
      desde: typeof req.query.desde === "string" ? req.query.desde : undefined,
      hasta: typeof req.query.hasta === "string" ? req.query.hasta : undefined,
    });
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ exito: false, error: message });
  }
};

export const crearBloqueoClub = async (req: Request, res: Response) => {
  try {
    const clubId = String(req.params.id || "");
    const {
      cancha_id,
      fecha_inicio,
      fecha_fin,
      hora_inicio,
      hora_fin,
      motivo,
      tipo,
    } = req.body as Record<string, unknown>;

    const data = await ClubService.crearBloqueo(
      clubId,
      {
        cancha_id: typeof cancha_id === "string" ? cancha_id : null,
        fecha_inicio: String(fecha_inicio || ""),
        fecha_fin: String(fecha_fin || ""),
        hora_inicio: String(hora_inicio || ""),
        hora_fin: String(hora_fin || ""),
        motivo: typeof motivo === "string" ? motivo : null,
        tipo: tipo as "mantenimiento" | "torneo" | "abono" | "otro" | undefined,
      },
      req.user?.id,
    );
    return res.status(201).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ exito: false, error: message });
  }
};

export const eliminarBloqueoClub = async (req: Request, res: Response) => {
  try {
    const clubId = String(req.params.id || "");
    const bloqueoId = String(req.params.bloqueoId || "");
    if (req.query.hard === "1") {
      await ClubService.eliminarBloqueo(clubId, bloqueoId);
    } else {
      await ClubService.desactivarBloqueo(clubId, bloqueoId);
    }
    return res.status(200).json({ exito: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ exito: false, error: message });
  }
};
