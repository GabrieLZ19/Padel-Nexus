import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env.config";
import {
  COMUNICACIONES_BATCH_SIZE,
  COMUNICACIONES_LISTA_TIPOS,
  esAudienciaTipoValido,
  normalizarEtiquetas,
  type ComunicacionesAudienciaTipo,
  type ComunicacionesDestinatarioEstado,
  type ComunicacionesEtiqueta,
  type ComunicacionesFiltros,
  type ComunicacionesListaTipo,
} from "../constants/comunicaciones";
import type { RolUsuario } from "../constants/roles";
import { ComunicacionesAudienciaService } from "./comunicaciones-audiencia.service";
import { NotificacionService } from "./notificacion.service";

export interface CrearListaPayload {
  nombre: string;
  tipo: ComunicacionesListaTipo;
  descripcion?: string | null;
  etiquetas?: ComunicacionesEtiqueta[];
  filtros?: ComunicacionesFiltros;
  miembro_ids?: string[];
}

export interface ActualizarListaPayload {
  nombre?: string;
  descripcion?: string | null;
  etiquetas?: ComunicacionesEtiqueta[];
  filtros?: ComunicacionesFiltros;
  miembro_ids?: string[];
}

export interface PreviewAudienciaPayload {
  audiencia_tipo: ComunicacionesAudienciaTipo;
  filtros?: ComunicacionesFiltros;
  lista_id?: string | null;
}

export interface EnviarCampanaPayload {
  titulo: string;
  mensaje: string;
  audiencia_tipo: ComunicacionesAudienciaTipo;
  filtros?: ComunicacionesFiltros;
  lista_id?: string | null;
  action_url?: string | null;
}

export interface ContactoBusqueda {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  dni: string | null;
  rol: string | null;
  lugar_residencia: string | null;
  club_id: string | null;
  avatar_url: string | null;
}

function assertListaTipo(tipo: string): asserts tipo is ComunicacionesListaTipo {
  if (!(COMUNICACIONES_LISTA_TIPOS as readonly string[]).includes(tipo)) {
    throw new Error("Tipo de lista inválido. Usá 'manual' o 'dinamica'.");
  }
}

function hostnameSinWww(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/**
 * Acepta rutas relativas (/ranking) o URLs absolutas http(s).
 * Si el host es el frontend de la app, se normaliza a ruta relativa.
 */
function normalizarActionUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("//")) {
    throw new Error(
      "Link inválido. Usá una ruta (/ranking) o una URL completa (https://…).",
    );
  }

  if (/^https?:\/\//i.test(trimmed)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error("Link inválido. Revisá el formato de la URL.");
    }

    const knownHosts = new Set<string>([
      "padelnexus.netlify.app",
      "localhost",
      "127.0.0.1",
    ]);

    try {
      knownHosts.add(hostnameSinWww(new URL(env.FRONTEND_URL).hostname));
    } catch {
      // ignore
    }

    const host = hostnameSinWww(parsed.hostname);
    if (knownHosts.has(host)) {
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return path || "/";
    }

    return trimmed;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export class ComunicacionesService {
  /**
   * Busca perfiles para armar listas manuales (nombre, apellido, email, DNI).
   * Respeta el alcance del rol del remitente.
   */
  static async buscarContactos(
    actorId: string,
    actorRol: RolUsuario,
    queryRaw: string,
  ): Promise<ContactoBusqueda[]> {
    const q = queryRaw.trim();
    if (q.length < 2) {
      throw new Error("Escribí al menos 2 caracteres para buscar.");
    }

    const term = `%${q.replace(/[%_,]/g, "\\$&")}%`;
    // Comillas dobles: emails con @ rompen el filtro .or() de PostgREST si van sin quoting.
    const quoted = `"${term.replace(/"/g, '\\"')}"`;

    let query = supabaseAdmin
      .from("perfiles")
      .select(
        "id, nombre, apellido, email, dni, rol, lugar_residencia, club_id, avatar_url",
      )
      .or(
        `nombre.ilike.${quoted},apellido.ilike.${quoted},email.ilike.${quoted},dni.ilike.${quoted}`,
      )
      .order("apellido", { ascending: true })
      .limit(30);

    if (actorRol === "admin_club") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("club_id")
        .eq("id", actorId)
        .maybeSingle();
      if (!perfil?.club_id) {
        throw new Error("Tu perfil no tiene club asignado.");
      }
      query = query.eq("club_id", perfil.club_id);
    } else if (actorRol === "admin_provincial") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("lugar_residencia")
        .eq("id", actorId)
        .maybeSingle();
      const provincia = (perfil?.lugar_residencia || "").trim();
      if (!provincia) {
        throw new Error(
          "Tu perfil no tiene provincia. Completalo antes de buscar contactos.",
        );
      }
      query = query.eq("lugar_residencia", provincia);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error al buscar contactos: ${error.message}`);
    }

    return (data || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      email: p.email,
      dni: p.dni,
      rol: p.rol,
      lugar_residencia: p.lugar_residencia,
      club_id: p.club_id,
      avatar_url: p.avatar_url ?? null,
    }));
  }

  static async listarListas(ownerId: string) {
    const { data: listas, error } = await supabaseAdmin
      .from("comunicaciones_listas")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(`Error al listar listas: ${error.message}`);

    const ids = (listas || []).map((l) => l.id);
    const miembrosCount = new Map<string, number>();

    if (ids.length > 0) {
      const { data: miembros } = await supabaseAdmin
        .from("comunicaciones_lista_miembros")
        .select("lista_id")
        .in("lista_id", ids);

      for (const m of miembros || []) {
        miembrosCount.set(m.lista_id, (miembrosCount.get(m.lista_id) || 0) + 1);
      }
    }

    return (listas || []).map((lista) => ({
      ...lista,
      miembros_count:
        lista.tipo === "manual" ? miembrosCount.get(lista.id) || 0 : null,
    }));
  }

  static async obtenerLista(ownerId: string, listaId: string) {
    const { data: lista, error } = await supabaseAdmin
      .from("comunicaciones_listas")
      .select("*")
      .eq("id", listaId)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener lista: ${error.message}`);
    if (!lista) throw new Error("Lista no encontrada.");

    let miembros: Array<{
      perfil_id: string;
      nombre: string | null;
      apellido: string | null;
      email: string | null;
      avatar_url: string | null;
    }> = [];

    if (lista.tipo === "manual") {
      const { data: rows } = await supabaseAdmin
        .from("comunicaciones_lista_miembros")
        .select("perfil_id")
        .eq("lista_id", listaId);

      const perfilIds = (rows || []).map((r) => r.perfil_id);
      if (perfilIds.length > 0) {
        const { data: perfiles } = await supabaseAdmin
          .from("perfiles")
          .select("id, nombre, apellido, email, avatar_url")
          .in("id", perfilIds);

        const map = new Map((perfiles || []).map((p) => [p.id, p]));
        miembros = perfilIds.map((perfilId) => {
          const perfil = map.get(perfilId);
          return {
            perfil_id: perfilId,
            nombre: perfil?.nombre ?? null,
            apellido: perfil?.apellido ?? null,
            email: perfil?.email ?? null,
            avatar_url: perfil?.avatar_url ?? null,
          };
        });
      }
    }

    return { ...lista, miembros };
  }

  static async crearLista(ownerId: string, payload: CrearListaPayload) {
    const nombre = (payload.nombre || "").trim();
    if (!nombre) throw new Error("El nombre de la lista es obligatorio.");
    assertListaTipo(payload.tipo);

    if (payload.tipo === "dinamica" && !payload.filtros) {
      throw new Error("Las listas dinámicas requieren filtros.");
    }

    if (
      payload.tipo === "manual" &&
      (!payload.miembro_ids || payload.miembro_ids.length === 0)
    ) {
      // Permitimos crear vacía y completar después
    }

    const { data: lista, error } = await supabaseAdmin
      .from("comunicaciones_listas")
      .insert({
        owner_id: ownerId,
        nombre,
        tipo: payload.tipo,
        descripcion: payload.descripcion?.trim() || null,
        etiquetas: normalizarEtiquetas(payload.etiquetas),
        filtros: payload.tipo === "dinamica" ? payload.filtros || {} : {},
      })
      .select()
      .single();

    if (error || !lista) {
      throw new Error(`Error al crear lista: ${error?.message || "desconocido"}`);
    }

    if (payload.tipo === "manual" && payload.miembro_ids?.length) {
      await this.reemplazarMiembros(lista.id, payload.miembro_ids);
    }

    return this.obtenerLista(ownerId, lista.id);
  }

  static async actualizarLista(
    ownerId: string,
    listaId: string,
    payload: ActualizarListaPayload,
  ) {
    const actual = await this.obtenerLista(ownerId, listaId);

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.nombre !== undefined) {
      const nombre = payload.nombre.trim();
      if (!nombre) throw new Error("El nombre no puede estar vacío.");
      patch.nombre = nombre;
    }

    if (payload.descripcion !== undefined) {
      patch.descripcion = payload.descripcion?.trim() || null;
    }

    if (payload.etiquetas !== undefined) {
      patch.etiquetas = normalizarEtiquetas(payload.etiquetas);
    }

    if (payload.filtros !== undefined) {
      if (actual.tipo !== "dinamica") {
        throw new Error("Solo las listas dinámicas admiten filtros.");
      }
      patch.filtros = payload.filtros;
    }

    const { error } = await supabaseAdmin
      .from("comunicaciones_listas")
      .update(patch)
      .eq("id", listaId)
      .eq("owner_id", ownerId);

    if (error) throw new Error(`Error al actualizar lista: ${error.message}`);

    if (payload.miembro_ids !== undefined) {
      if (actual.tipo !== "manual") {
        throw new Error("Solo las listas manuales admiten miembros.");
      }
      await this.reemplazarMiembros(listaId, payload.miembro_ids);
    }

    return this.obtenerLista(ownerId, listaId);
  }

  static async eliminarLista(ownerId: string, listaId: string) {
    const { error } = await supabaseAdmin
      .from("comunicaciones_listas")
      .delete()
      .eq("id", listaId)
      .eq("owner_id", ownerId);

    if (error) throw new Error(`Error al eliminar lista: ${error.message}`);
    return true;
  }

  private static async reemplazarMiembros(
    listaId: string,
    miembroIds: string[],
  ) {
    const unique = [...new Set(miembroIds.filter(Boolean))];

    if (unique.length > 0) {
      const { data: perfiles, error: perfError } = await supabaseAdmin
        .from("perfiles")
        .select("id")
        .in("id", unique);

      if (perfError) {
        throw new Error(`Error al validar miembros: ${perfError.message}`);
      }
      if ((perfiles || []).length !== unique.length) {
        throw new Error("Uno o más perfiles de la lista no existen.");
      }
    }

    const { error: delError } = await supabaseAdmin
      .from("comunicaciones_lista_miembros")
      .delete()
      .eq("lista_id", listaId);

    if (delError) {
      throw new Error(`Error al limpiar miembros: ${delError.message}`);
    }

    if (unique.length === 0) return;

    const { error: insError } = await supabaseAdmin
      .from("comunicaciones_lista_miembros")
      .insert(
        unique.map((perfil_id) => ({
          lista_id: listaId,
          perfil_id,
        })),
      );

    if (insError) {
      throw new Error(`Error al guardar miembros: ${insError.message}`);
    }
  }

  static async previewAudiencia(
    actorId: string,
    actorRol: RolUsuario,
    payload: PreviewAudienciaPayload,
  ) {
    if (!esAudienciaTipoValido(payload.audiencia_tipo)) {
      throw new Error("audiencia_tipo inválido.");
    }

    const result = await ComunicacionesAudienciaService.resolver({
      actorId,
      actorRol,
      audienciaTipo: payload.audiencia_tipo,
      filtros: payload.filtros || {},
      listaId: payload.lista_id,
    });

    return {
      total: result.total,
      sample: result.sample,
    };
  }

  static async enviarCampana(
    actorId: string,
    actorRol: RolUsuario,
    payload: EnviarCampanaPayload,
  ) {
    const titulo = (payload.titulo || "").trim();
    const mensaje = (payload.mensaje || "").trim();

    if (!titulo) throw new Error("El título es obligatorio.");
    if (!mensaje) throw new Error("El mensaje es obligatorio.");
    if (!esAudienciaTipoValido(payload.audiencia_tipo)) {
      throw new Error("audiencia_tipo inválido.");
    }

    const actionUrl = normalizarActionUrl(payload.action_url);
    const filtros = payload.filtros || {};

    const audiencia = await ComunicacionesAudienciaService.resolver({
      actorId,
      actorRol,
      audienciaTipo: payload.audiencia_tipo,
      filtros,
      listaId: payload.lista_id,
    });

    if (audiencia.total === 0) {
      throw new Error("No hay destinatarios para la audiencia seleccionada.");
    }

    const { data: campana, error: campError } = await supabaseAdmin
      .from("comunicaciones_campanas")
      .insert({
        creador_id: actorId,
        titulo,
        mensaje,
        lista_id: payload.lista_id || null,
        audiencia_tipo: payload.audiencia_tipo,
        filtros_usados: filtros,
        action_url: actionUrl,
        total_destinatarios: audiencia.total,
        total_enviados: 0,
      })
      .select()
      .single();

    if (campError || !campana) {
      throw new Error(
        `Error al registrar campaña: ${campError?.message || "desconocido"}`,
      );
    }

    const metadata = {
      origen: "comunicaciones_campana",
      campana_id: campana.id,
      action_url: actionUrl,
      audiencia_tipo: payload.audiencia_tipo,
    };

    let totalEnviados = 0;
    const destinatarioRows: Array<{
      campana_id: string;
      usuario_id: string;
      estado: ComunicacionesDestinatarioEstado;
    }> = [];

    for (let i = 0; i < audiencia.ids.length; i += COMUNICACIONES_BATCH_SIZE) {
      const batch = audiencia.ids.slice(i, i + COMUNICACIONES_BATCH_SIZE);

      const resultados = await Promise.all(
        batch.map(async (usuarioId) => {
          try {
            const notif = await NotificacionService.crearNotificacion({
              usuario_id: usuarioId,
              titulo,
              mensaje,
              tipo: "info",
              metadata,
            });

            if (notif) {
              totalEnviados += 1;
              return {
                campana_id: campana.id,
                usuario_id: usuarioId,
                estado: "enviado" as const,
              };
            }

            return {
              campana_id: campana.id,
              usuario_id: usuarioId,
              estado: "omitido_prefs" as const,
            };
          } catch {
            return {
              campana_id: campana.id,
              usuario_id: usuarioId,
              estado: "error" as const,
            };
          }
        }),
      );

      destinatarioRows.push(...resultados);
    }

    if (destinatarioRows.length > 0) {
      const { error: destError } = await supabaseAdmin
        .from("comunicaciones_campana_destinatarios")
        .insert(destinatarioRows);

      if (destError) {
        console.error(
          "Error al guardar destinatarios de campaña:",
          destError.message,
        );
      }
    }

    const { data: campanaFinal, error: updError } = await supabaseAdmin
      .from("comunicaciones_campanas")
      .update({ total_enviados: totalEnviados })
      .eq("id", campana.id)
      .select()
      .single();

    if (updError) {
      console.error("Error al actualizar total_enviados:", updError.message);
    }

    return {
      campana: campanaFinal || { ...campana, total_enviados: totalEnviados },
      total_destinatarios: audiencia.total,
      total_enviados: totalEnviados,
    };
  }

  /**
   * Lista campañas segun el alcance del actor:
   * - `superadmin` / `admin_federacion`: ven todas las campañas.
   * - `admin_provincial`: campañas propias y de admins de su provincia.
   * - Resto de roles administrativos: solo campañas propias.
   *
   * Se hace join con `perfiles` para exponer nombre y rol del remitente.
   */
  static async listarCampanas(
    actor: { id: string; rol: string },
    opts?: { limit?: number; offset?: number },
  ) {
    const limit = Math.min(Math.max(opts?.limit || 20, 1), 100);
    const offset = Math.max(opts?.offset || 0, 0);

    let query = supabaseAdmin
      .from("comunicaciones_campanas")
      .select(
        `*, creador:perfiles!comunicaciones_campanas_creador_id_fkey (
          id, nombre, apellido, email, rol
        )`,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const rol = actor.rol;
    if (rol === "superadmin" || rol === "admin_federacion") {
      // Ven todo, sin filtro por creador.
    } else if (rol === "admin_provincial") {
      // Ven las suyas + las de admins provinciales de su misma provincia.
      const { data: perfilActor } = await supabaseAdmin
        .from("perfiles")
        .select("lugar_residencia")
        .eq("id", actor.id)
        .maybeSingle();
      const provincia = (perfilActor?.lugar_residencia || "").trim();
      if (provincia) {
        const { data: pares } = await supabaseAdmin
          .from("perfiles")
          .select("id")
          .eq("rol", "admin_provincial")
          .eq("lugar_residencia", provincia);
        const ids = new Set<string>([
          actor.id,
          ...((pares || []).map((p) => p.id)),
        ]);
        query = query.in("creador_id", [...ids]);
      } else {
        query = query.eq("creador_id", actor.id);
      }
    } else {
      query = query.eq("creador_id", actor.id);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`Error al listar campañas: ${error.message}`);

    return {
      data: data || [],
      total: count || 0,
      limit,
      offset,
    };
  }
}
