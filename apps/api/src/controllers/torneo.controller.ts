import { Request, Response } from "express";
import { TorneoService } from "../services/torneo.service";
import { CompetenciaService } from "../services/competencia.service";
import { supabaseAdmin } from "../config/supabase";
import sharp from "sharp";

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
    console.error("🚨 ERROR EN updateTorneo:", error);
    return res
      .status(500)
      .json({ message: "Error al actualizar torneo", error: error.message || String(error) });
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
    const { ordenSiembra, motivo } = req.body;
    const count = await TorneoService.generarCuadroEliminatoria(req.params.id, ordenSiembra, req.user?.id, motivo);
    return res
      .status(200)
      .json({ message: "Cuadro generado exitosamente", partidosCount: count });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: "Error al generar cuadros", error: error.message });
  }
};

export const guardarSiembraCustom = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { matches, motivo } = req.body;
    await TorneoService.guardarSiembraCustom(
      req.params.id,
      matches,
      motivo,
      req.user?.id || ""
    );
    return res.status(200).json({ message: "Siembra guardada exitosamente" });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: "Error al guardar la siembra", error: error.message });
  }
};

export const actualizarResultado = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { partido_id } = req.params;
    const { 
      ganador_id, 
      set1_a, 
      set1_b, 
      set2_a, 
      set2_b, 
      set3_a, 
      set3_b, 
      es_supertiebreak, 
      es_wo, 
      es_injustificado_wo 
    } = req.body;

    const user_id = req.user?.id;
    const user_rol = req.user?.rol;

    const isAdmin = ["superadmin", "admin_federacion", "admin_provincial", "admin"].includes(user_rol || "");

    if (!isAdmin) {
      // Si es un jugador regular, verificar si está asignado como fiscal en este torneo
      const { data: partidoData, error: errPartido } = await supabaseAdmin
        .from("partidos")
        .select("torneo_id")
        .eq("id", partido_id)
        .single();
        
      if (errPartido || !partidoData) {
        return res.status(404).json({ message: "Partido no encontrado o no pertenece a ningún torneo" });
      }

      const { data: fiscalAsociado } = await supabaseAdmin
        .from("torneo_fiscales")
        .select("fiscal_id, fiscales(usuario_id)")
        .eq("torneo_id", partidoData.torneo_id)
        .maybeSingle();

      const isFiscalAsignado = (fiscalAsociado as any)?.fiscales?.usuario_id === user_id;

      if (!isFiscalAsignado) {
        return res.status(403).json({ message: "No tienes permisos de fiscal en este torneo" });
      }
    }
    
    await TorneoService.procesarResultadoYAvance(
      partido_id,
      ganador_id,
      Number(set1_a),
      Number(set1_b),
      set2_a !== undefined && set2_a !== null ? Number(set2_a) : null,
      set2_b !== undefined && set2_b !== null ? Number(set2_b) : null,
      set3_a !== undefined && set3_a !== null ? Number(set3_a) : null,
      set3_b !== undefined && set3_b !== null ? Number(set3_b) : null,
      Boolean(es_supertiebreak),
      Boolean(es_wo),
      Boolean(es_injustificado_wo),
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

export const actualizarEquiposPartido = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { partido_id } = req.params;
    const { equipo_a_id, equipo_b_id, motivo } = req.body;
    const admin_id = req.user?.id;
    if (!admin_id) return res.status(401).json({ message: "No autorizado" });
    await TorneoService.actualizarEquiposPartido(partido_id, equipo_a_id ?? null, equipo_b_id ?? null, motivo || "Ajuste manual de rivales", admin_id);
    return res.status(200).json({ message: "Rivales actualizados exitosamente" });
  } catch (error: any) {
    return res.status(500).json({ message: "Error al actualizar rivales", error: error.message });
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
    const { zonas, motivo, validarCabezasSerie } = req.body;
    const admin_id = req.user?.id;
    if (!admin_id) {
      return res.status(401).json({ message: "No autorizado" });
    }
    const resultado = await CompetenciaService.guardarZonas(
      torneoId,
      zonas,
      motivo,
      admin_id,
      validarCabezasSerie
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

export const obtenerSedesTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const list = await TorneoService.obtenerSedes(req.params.id);
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Error al obtener sedes", error: error.message });
  }
};

export const guardarSedesTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { club_ids } = req.body;
    await TorneoService.guardarSedes(req.params.id, club_ids);
    return res.status(200).json({ message: "Sedes guardadas correctamente" });
  } catch (error: any) {
    return res.status(400).json({ message: "Error al guardar sedes", error: error.message });
  }
};

export const obtenerCanchasDisponibilidadTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const list = await TorneoService.obtenerCanchasDisponibilidad(req.params.id);
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Error al obtener disponibilidad de canchas", error: error.message });
  }
};

export const guardarCanchasDisponibilidadTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { disponibilidad } = req.body;
    await TorneoService.guardarCanchasDisponibilidad(req.params.id, disponibilidad);
    return res.status(200).json({ message: "Disponibilidad de canchas guardada correctamente" });
  } catch (error: any) {
    return res.status(400).json({ message: "Error al guardar disponibilidad de canchas", error: error.message });
  }
};

export const subirBannerTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { imagenB64 } = req.body;

    if (!imagenB64) {
      return res.status(400).json({ message: "Imagen en formato base64 requerida." });
    }

    const matches = imagenB64.match(/^data:image\/\w+;base64,(.+)$/);
    const rawBuffer = matches
      ? Buffer.from(matches[1], "base64")
      : Buffer.from(imagenB64, "base64");

    // Optimizar imagen usando sharp: Max 1200px ancho, formato WebP, calidad 75
    const compressedBuffer = await sharp(rawBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    const filePath = `${id}/banner_${Date.now()}.webp`;

    // Subir a storage en bucket 'torneos'
    const { error: uploadError } = await supabaseAdmin.storage
      .from("torneos")
      .upload(filePath, compressedBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Error al subir imagen al storage: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("torneos")
      .getPublicUrl(filePath);

    // Obtener torneo actual para actualizar su lista de banners
    const torneo = await TorneoService.obtenerPorId(id);
    const bannersList = Array.isArray(torneo?.banners) ? torneo.banners : [];
    bannersList.push(publicUrl);

    await TorneoService.actualizarTorneo(id, { banners: bannersList });

    return res.status(200).json({ banners: bannersList });
  } catch (error: any) {
    return res.status(500).json({ message: "Error al subir el banner", error: error.message });
  }
};

export const eliminarBannerTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { bannerUrl } = req.body;

    if (!bannerUrl) {
      return res.status(400).json({ message: "URL del banner requerida." });
    }

    // Obtener torneo actual
    const torneo = await TorneoService.obtenerPorId(id);
    let bannersList = Array.isArray(torneo?.banners) ? torneo.banners : [];
    bannersList = bannersList.filter((b: string) => b !== bannerUrl);

    // Eliminar del storage si corresponde
    try {
      const parts = bannerUrl.split("/torneos/");
      if (parts.length === 2) {
        await supabaseAdmin.storage.from("torneos").remove([parts[1]]);
      }
    } catch (err) {
      console.error("No se pudo remover del storage:", err);
    }

    await TorneoService.actualizarTorneo(id, { banners: bannersList });

    return res.status(200).json({ banners: bannersList });
  } catch (error: any) {
    return res.status(500).json({ message: "Error al eliminar el banner", error: error.message });
  }
};

