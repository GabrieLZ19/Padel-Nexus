import { Request, Response } from "express";
import { TorneoService } from "../services/torneo.service";
import { CompetenciaService } from "../services/competencia.service";
import { supabaseAdmin } from "../config/supabase";

export const getAllTorneos = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { page, limit, search, estado } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = Number(limit || "10");

    const resultado = await TorneoService.listarTorneos(pageNum, limitNum, {
      search: search as string | undefined,
      estado: estado as string | undefined,
    });

    return res
      .status(200)
      .json(
        resultado.paginated
          ? { data: resultado.data, total: resultado.total }
          : resultado.data,
      );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return res
      .status(500)
      .json({ message: "Error al obtener torneos", error: msg });
  }
};

export const getTorneoById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data = await TorneoService.obtenerPorId(req.params.id);
    return res.status(200).json(data);
  } catch (error: unknown) {
    return res.status(404).json({ message: "Torneo no encontrado" });
  }
};

export const createTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const torneo = await TorneoService.crearTorneo(req.body);
    return res.status(201).json(torneo);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return res
      .status(500)
      .json({ message: "Error al crear torneo", error: msg });
  }
};

export const updateTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data = await TorneoService.actualizarTorneo(req.params.id, req.body);
    return res.status(200).json(data);
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Error al actualizar torneo", error: error.message });
  }
};

export const deleteTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    await TorneoService.eliminarTorneo(req.params.id);
    return res.status(200).json({ message: "Torneo eliminado correctamente" });
  } catch (error: unknown) {
    return res.status(500).json({ message: "Error al eliminar torneo" });
  }
};

export const getInscripcionesByTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data = await TorneoService.obtenerInscripciones(req.params.id);
    return res.status(200).json(data);
  } catch (error: unknown) {
    return res.status(500).json({ message: "Error al obtener inscripciones" });
  }
};

export const getPartidosByTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const partidos = await TorneoService.obtenerPartidosFormateados(
      req.params.id,
    );
    return res.status(200).json(partidos);
  } catch (error: unknown) {
    return res.status(500).json({ message: "Error al obtener partidos" });
  }
};

export const generarCuadros = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const count = await TorneoService.generarCuadroEliminatoria(req.params.id);
    return res
      .status(200)
      .json({ message: "Cuadro generado exitosamente", partidosCount: count });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: "Error al generar cuadros", error: error.message });
  }
};

export const actualizarResultado = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { partido_id } = req.params;
    const { ganador_id, set1_a, set1_b } = req.body;
    await TorneoService.procesarResultadoYAvance(
      partido_id,
      ganador_id,
      Number(set1_a),
      Number(set1_b),
    );
    return res
      .status(200)
      .json({
        message: "Resultado cargado y estadísticas distribuidas con éxito",
      });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Error al actualizar partido", error: error.message });
  }
};

export const getZonasByTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const zonas = await CompetenciaService.obtenerZonas(req.params.id);
    return res.status(200).json(zonas);
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Error al obtener zonas", error: error.message });
  }
};

export const moverParejaOverride = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { inscripcion_id, grupo_origen_id, grupo_destino_id, motivo } = req.body;
    const admin_id = req.user?.id;
    if (!admin_id) {
        return res.status(401).json({ message: "No autorizado" });
    }
    const resultado = await CompetenciaService.moverPareja(
      inscripcion_id,
      grupo_origen_id,
      grupo_destino_id,
      motivo,
      admin_id
    );
    return res.status(200).json(resultado);
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: "Error al mover pareja", error: error.message });
  }
};

export const guardarZonasOverride = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const torneoId = req.params.id;
    const { zonas, motivo } = req.body;
    const admin_id = req.user?.id;
    if (!admin_id) {
      return res.status(401).json({ message: "No autorizado" });
    }
    const resultado = await CompetenciaService.guardarZonas(
      torneoId,
      zonas,
      motivo,
      admin_id
    );
    return res.status(200).json(resultado);
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: "Error al guardar zonas", error: error.message });
  }
};

export const getAuditoriaByTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from("logs_auditoria")
      .select(`
        id,
        accion,
        detalles,
        created_at,
        perfiles!fk_logs_admin(nombre, apellido)
      `)
      .eq("entidad_afectada", req.params.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return res.status(200).json(logs);
  } catch (error: any) {
    return res.status(400).json({ message: "Error al obtener auditoría", error: error.message });
  }
};
