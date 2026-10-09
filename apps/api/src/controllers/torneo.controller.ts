import { Request, Response } from "express";
import { TorneoService } from "../services/torneo.service";
import { CompetenciaService } from "../services/competencia.service";
import { supabaseAdmin } from "../config/supabase";
import sharp from "sharp";
import { esRolAdministrativo } from "../constants/roles";
import { AlcanceCuentaService } from "../services/alcanceCuenta.service";
import { decidirAlcanceTorneo, type AccionSobreTorneo } from "../utils/alcanceCuenta";

async function negarAlcance(
  req: Request,
  torneoId: string,
  accion: AccionSobreTorneo,
): Promise<string | null> {
  try {
    await AlcanceCuentaService.exigir(req.user, torneoId, accion);
    return null;
  } catch (error: unknown) {
    return error instanceof Error ? error.message : "No tenés permiso para esta acción.";
  }
}

export const getAllTorneos = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { page, limit, search, estado, incluir_borradores, club_id, vista, agrupar } =
      req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = Number(limit || "10");

    let clubIdFiltro =
      typeof club_id === "string" && club_id.trim()
        ? club_id.trim()
        : undefined;

    // admin_club: siempre acotar al club del perfil (no confiar solo en el query)
    if (req.user?.rol === "admin_club" && req.user.id) {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("club_id")
        .eq("id", req.user.id)
        .maybeSingle();
      if (perfil?.club_id) {
        clubIdFiltro = perfil.club_id;
      } else {
        return res.status(200).json(
          pageNum !== undefined ? { data: [], total: 0 } : [],
        );
      }
    }

    const cuenta = await AlcanceCuentaService.resolver(req.user);
    if (cuenta.aviso && (cuenta.rol === "admin_provincial" || cuenta.rol === "admin_club")) {
      return res.status(200).json({
        data: [],
        total: 0,
        aviso: cuenta.aviso,
      });
    }

    let clubIds: string[] | undefined;
    let incluirNacionales = false;
    if (cuenta.rol === "admin_provincial" && cuenta.provincia) {
      clubIds = await AlcanceCuentaService.idsClubesDeProvincia(cuenta.provincia);
      incluirNacionales = true;
    }

    const resultado = await TorneoService.listarTorneos(pageNum, limitNum, {
      search: search as string | undefined,
      estado: estado as string | undefined,
      incluirBorradores: incluir_borradores === "true",
      clubId: clubIdFiltro,
      clubIds,
      incluirNacionales,
      vista: typeof vista === "string" ? vista : undefined,
      agrupar: agrupar === "true",
    });

    const marcar = <T extends { alcance?: string | null; club_id?: string | null; clubes?: { provincia?: string | null } | null }>(
      torneo: T,
    ) => {
      if (cuenta.rol !== "admin_provincial" && cuenta.rol !== "admin_club") return torneo;
      const decision = decidirAlcanceTorneo(
        cuenta,
        {
          alcance: torneo.alcance || null,
          clubId: torneo.club_id || null,
          provinciaClub: torneo.clubes?.provincia || null,
        },
        "editar",
      );
      const resultados = decidirAlcanceTorneo(
        cuenta,
        {
          alcance: torneo.alcance || null,
          clubId: torneo.club_id || null,
          provinciaClub: torneo.clubes?.provincia || null,
        },
        "resultados",
      );
      return {
        ...torneo,
        solo_lectura: !decision.permitido,
        puede_cargar_resultados: resultados.permitido,
      };
    };

    resultado.data = (resultado.data || []).map((torneo) => marcar(torneo));
    if (resultado.grupos) {
      resultado.grupos = resultado.grupos.map((grupo) => ({
        ...grupo,
        ramas: grupo.ramas.map((rama) => ({
          ...rama,
          torneos: rama.torneos.map((torneo) => marcar(torneo)),
        })),
      }));
    }

    return res.status(200).json(
      resultado.paginated
        ? {
            data: resultado.data,
            total: resultado.total,
            ...(resultado.total_torneos !== undefined
              ? { total_torneos: resultado.total_torneos, grupos: resultado.grupos }
              : {}),
            ...(resultado.vista
              ? {
                  vista: resultado.vista,
                  vista_automatica: resultado.vista_automatica,
                  contadores: resultado.contadores,
                  requieren_programacion: resultado.requieren_programacion,
                }
              : {}),
          }
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
    const cuenta = await AlcanceCuentaService.resolver(req.user);
    if (cuenta.rol === "admin_provincial" || cuenta.rol === "admin_club") {
      const ver = decidirAlcanceTorneo(
        cuenta,
        {
          alcance: data.alcance || null,
          clubId: data.club_id || null,
          provinciaClub: data.clubes?.provincia || null,
        },
        "ver",
      );
      if (!ver.permitido) {
        return res.status(403).json({ message: ver.motivo });
      }
      const resultados = decidirAlcanceTorneo(
        cuenta,
        {
          alcance: data.alcance || null,
          clubId: data.club_id || null,
          provinciaClub: data.clubes?.provincia || null,
        },
        "resultados",
      );
      data.solo_lectura = ver.soloLectura;
      data.puede_cargar_resultados = resultados.permitido;
    }
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

export const agruparTorneos = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const nombre = String(req.body?.nombre || "");
    const torneoIds = Array.isArray(req.body?.torneo_ids)
      ? req.body.torneo_ids.map((id: unknown) => String(id))
      : [];

    if (req.user?.rol === "admin_club" && req.user.id) {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("club_id")
        .eq("id", req.user.id)
        .maybeSingle();
      if (!perfil?.club_id) {
        return res.status(403).json({ message: "El club no tiene sede asignada." });
      }
      const { data: propios } = await supabaseAdmin
        .from("torneos")
        .select("id")
        .in("id", torneoIds)
        .eq("club_id", perfil.club_id);
      const permitidos = new Set((propios || []).map((torneo) => torneo.id));
      const ajenos = torneoIds.filter((id: string) => !permitidos.has(id));
      if (ajenos.length) {
        return res.status(403).json({ message: "Solo podés agrupar torneos de tu club." });
      }
    }

    const grupo = await TorneoService.agruparTorneos(nombre, torneoIds);
    return res.status(200).json(grupo);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ message: msg });
  }
};

export const replicarTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { niveles, ramas } = req.body as {
      niveles?: string[];
      ramas?: string[];
    };
    const negado = await negarAlcance(req, req.params.id, "editar");
    if (negado) return res.status(403).json({ message: negado });

    const rol = req.user?.rol;
    const soloMismaRama = rol === "admin_club";

    const resultado = await TorneoService.replicarTorneo(
      req.params.id,
      {
        niveles: Array.isArray(niveles) ? niveles : [],
        ramas: Array.isArray(ramas) ? ramas : undefined,
        soloMismaRama,
      },
      req.user?.id,
    );

    return res.status(201).json({
      exito: true,
      ...resultado,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return res.status(400).json({
      message: "No se pudo replicar el torneo.",
      error: msg,
    });
  }
};

export const updateTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const negado = await negarAlcance(req, req.params.id, "editar");
    if (negado) return res.status(403).json({ message: negado });
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
    const negado = await negarAlcance(req, req.params.id, "eliminar");
    if (negado) return res.status(403).json({ message: negado });

    await TorneoService.eliminarTorneo(req.params.id);
    return res.status(200).json({ message: "Torneo eliminado correctamente" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al eliminar torneo";
    return res.status(500).json({ message: msg });
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
    const negado = await negarAlcance(req, req.params.id, "editar");
    if (negado) return res.status(403).json({ message: negado });
    const { ordenSiembra, motivo, forzarDestructivo } = req.body;
    const count = await TorneoService.generarCuadroEliminatoria(
      req.params.id,
      ordenSiembra,
      req.user?.id,
      motivo,
      forzarDestructivo === true,
    );
    return res
      .status(200)
      .json({ message: "Cuadro generado exitosamente", partidosCount: count });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: "Error al generar cuadros", error: error.message });
  }
};

export const actualizarPartido = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { partido_id } = req.params;
    const { data: partido } = await supabaseAdmin
      .from("partidos")
      .select("torneo_id")
      .eq("id", partido_id)
      .maybeSingle();
    if (!partido?.torneo_id) {
      return res.status(404).json({ message: "Partido no encontrado" });
    }
    const negado = await negarAlcance(req, partido.torneo_id, "editar");
    if (negado) return res.status(403).json({ message: negado });
    const data = req.body;
    await TorneoService.actualizarPartido(partido_id, data);
    return res.status(200).json({ message: "Partido actualizado con éxito" });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: "Error al actualizar el partido", error: error.message });
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
      es_injustificado_wo,
      es_lesion,
    } = req.body;

    const user_id = req.user?.id;
    const user_rol = req.user?.rol;

    const { data: partidoData, error: errPartido } = await supabaseAdmin
      .from("partidos")
      .select("id, torneo_id")
      .eq("id", partido_id)
      .maybeSingle();

    if (errPartido || !partidoData?.torneo_id) {
      return res.status(404).json({
        message: "Partido no encontrado o no pertenece a ningún torneo",
      });
    }

    if (esRolAdministrativo(user_rol)) {
      const negado = await negarAlcance(req, partidoData.torneo_id, "resultados");
      if (negado) return res.status(403).json({ message: negado });
    } else {
      const { data: fiscalesAsignados } = await supabaseAdmin
        .from("torneo_fiscales")
        .select("fiscal_id, fiscales(usuario_id)")
        .eq("torneo_id", partidoData.torneo_id);

      const isFiscalAsignado = (fiscalesAsignados || []).some((row) => {
        const fiscalesRel = row.fiscales as
          | { usuario_id?: string }
          | { usuario_id?: string }[]
          | null
          | undefined;
        const fiscal = Array.isArray(fiscalesRel)
          ? fiscalesRel[0]
          : fiscalesRel;
        return fiscal?.usuario_id === user_id;
      });

      if (!isFiscalAsignado) {
        return res.status(403).json({
          message: "No tienes permisos de fiscal en este torneo",
        });
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
      Boolean(es_lesion),
    );
    return res.status(200).json({
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
    const { data: partidoEquipos } = await supabaseAdmin
      .from("partidos")
      .select("torneo_id")
      .eq("id", partido_id)
      .maybeSingle();
    if (!partidoEquipos?.torneo_id) {
      return res.status(404).json({ message: "Partido no encontrado" });
    }
    const negado = await negarAlcance(req, partidoEquipos.torneo_id, "editar");
    if (negado) return res.status(403).json({ message: negado });
    const admin_id = req.user?.id;
    if (!admin_id) return res.status(401).json({ message: "No autorizado" });
    if (!motivo?.trim()) {
      return res.status(400).json({ message: "El motivo es obligatorio" });
    }
    await TorneoService.actualizarEquiposPartido(partido_id, equipo_a_id ?? null, equipo_b_id ?? null, motivo, admin_id);
    return res.status(200).json({ message: "Rivales actualizados exitosamente" });
  } catch (error: any) {
    return res.status(500).json({ message: "Error al actualizar rivales", error: error.message });
  }
};

export const gestionarParejaLlave = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const torneoId = req.params.id;
    const negado = await negarAlcance(req, torneoId, "editar");
    if (negado) return res.status(403).json({ message: negado });
    const { accion, inscripcion_id, motivo } = req.body;
    const admin_id = req.user?.id;
    if (!admin_id) return res.status(401).json({ message: "No autorizado" });
    if (accion !== "agregar" && accion !== "quitar") {
      return res.status(400).json({ message: "accion debe ser 'agregar' o 'quitar'" });
    }
    if (!inscripcion_id) {
      return res.status(400).json({ message: "inscripcion_id es obligatorio" });
    }
    const resultado = await TorneoService.gestionarParejaLlave(
      torneoId,
      accion,
      inscripcion_id,
      motivo || "",
      admin_id,
    );
    return res.status(200).json(resultado);
  } catch (error: any) {
    return res.status(400).json({
      message: "Error al gestionar pareja en la llave",
      error: error.message,
    });
  }
};

export const opcionesPromocionMenores = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { PromocionMenoresService } = await import(
      "../services/promocionMenores.service"
    );
    const opciones = await PromocionMenoresService.opciones(req.params.id);
    return res.status(200).json(opciones);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error";
    return res.status(400).json({ message });
  }
};

export const promoverParejaMenores = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message: "No autorizado" });
    const { inscripcion_id, torneo_destino_id, partido_destino_id, lado, motivo } =
      req.body as {
        inscripcion_id?: string;
        torneo_destino_id?: string;
        partido_destino_id?: string | null;
        lado?: "a" | "b" | null;
        motivo?: string;
      };
    if (!inscripcion_id || !torneo_destino_id) {
      return res
        .status(400)
        .json({ message: "Falta la pareja o la categoría destino." });
    }
    const { PromocionMenoresService } = await import(
      "../services/promocionMenores.service"
    );
    const resultado = await PromocionMenoresService.promover({
      torneoOrigenId: req.params.id,
      inscripcionId: inscripcion_id,
      torneoDestinoId: torneo_destino_id,
      partidoDestinoId: partido_destino_id || null,
      ladoDestino: lado === "a" || lado === "b" ? lado : null,
      motivo: motivo || "",
      adminId,
    });
    return res.status(200).json(resultado);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error";
    return res.status(400).json({ message });
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

export const getLlaveMatriz = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { FAP_ESTADOS_PAGO } = await import("../constants/fap");
    const { getFapBracketForPairCount } = await import(
      "../utils/fapBracketMatrices"
    );

    const { count } = await supabaseAdmin
      .from("inscripciones")
      .select("id", { count: "exact", head: true })
      .eq("torneo_id", req.params.id)
      .eq("estado_pago", FAP_ESTADOS_PAGO.CONFIRMADO);

    const pairCount = count || 0;
    const matches = getFapBracketForPairCount(pairCount);

    return res.status(200).json({
      pairCount,
      matches: matches || [],
      supported: Boolean(matches),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return res
      .status(500)
      .json({ message: "Error al obtener matriz de llave", error: msg });
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
    const rol = req.user?.rol;
    const userId = req.user?.id;

    if (rol === "admin_club" && userId) {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("club_id")
        .eq("id", userId)
        .maybeSingle();

      const torneo = await TorneoService.obtenerPorId(req.params.id);
      if (!perfil?.club_id || torneo.club_id !== perfil.club_id) {
        return res.status(403).json({
          message: "Solo podés editar el cronograma de torneos de tu propio club.",
        });
      }
    }

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

