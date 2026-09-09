import { supabaseAdmin } from "../config/supabase";
import { AFILIACION_ESTADOS } from "../constants/afiliacion";
import { FAP_ESTADOS_PAGO } from "../constants/fap";
import type { RolUsuario } from "../constants/roles";
import {
  COMUNICACIONES_MAX_DESTINATARIOS,
  type ComunicacionesAudienciaTipo,
  type ComunicacionesFiltros,
} from "../constants/comunicaciones";

export interface AudienciaSamplePerfil {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  rol: string | null;
}

export interface AudienciaPreviewResult {
  total: number;
  ids: string[];
  sample: AudienciaSamplePerfil[];
}

interface ResolverContext {
  actorId: string;
  actorRol: RolUsuario;
  audienciaTipo: ComunicacionesAudienciaTipo;
  filtros: ComunicacionesFiltros;
  listaId?: string | null;
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export class ComunicacionesAudienciaService {
  /**
   * Resuelve destinatarios aplicando alcance por rol del remitente.
   */
  static async resolver(ctx: ResolverContext): Promise<AudienciaPreviewResult> {
    let filtrosBase = { ...ctx.filtros };
    let listaTipo: "manual" | "dinamica" | null = null;

    if (ctx.audienciaTipo === "lista") {
      if (!ctx.listaId) {
        throw new Error("Se requiere lista_id para audiencia de tipo lista.");
      }

      const { data: lista, error } = await supabaseAdmin
        .from("comunicaciones_listas")
        .select("id, owner_id, tipo, filtros, etiquetas")
        .eq("id", ctx.listaId)
        .maybeSingle();

      if (error || !lista) {
        throw new Error("Lista no encontrada.");
      }
      if (lista.owner_id !== ctx.actorId) {
        throw new Error("No tenés acceso a esa lista.");
      }

      listaTipo = lista.tipo as "manual" | "dinamica";

      if (lista.tipo === "manual") {
        const { data: miembros, error: memError } = await supabaseAdmin
          .from("comunicaciones_lista_miembros")
          .select("perfil_id")
          .eq("lista_id", ctx.listaId);

        if (memError) {
          throw new Error(`Error al leer miembros: ${memError.message}`);
        }

        const ids = uniqueIds((miembros || []).map((m) => m.perfil_id));
        let idsScoped = await this.filtrarIdsPorAlcance(ctx, ids);
        const etiquetasLista = (lista.etiquetas || []) as string[];
        if (etiquetasLista.includes("marketing")) {
          idsScoped = await this.excluirMenores(idsScoped);
        }
        const sample = await this.obtenerSample(idsScoped.slice(0, 5));

        if (idsScoped.length > COMUNICACIONES_MAX_DESTINATARIOS) {
          throw new Error(
            `La audiencia supera el máximo de ${COMUNICACIONES_MAX_DESTINATARIOS} destinatarios. Reducí los filtros o dividí la campaña.`,
          );
        }

        return {
          total: idsScoped.length,
          ids: idsScoped,
          sample,
        };
      }

      // Dinámica: partir de filtros guardados y luego aplicar alcance de rol
      filtrosBase = {
        ...((lista.filtros || {}) as ComunicacionesFiltros),
        ...filtrosBase,
      };
    }

    const filtrosConAlcanceInput = {
      ...ctx,
      filtros: filtrosBase,
      audienciaTipo:
        listaTipo === "dinamica"
          ? this.inferirTipoDesdeFiltros(filtrosBase)
          : ctx.audienciaTipo,
    };

    // Admin club: listas dinámicas siempre caen en jugadores de su club
    // (salvo inscritos de torneo, que se filtra aparte).
    if (
      ctx.actorRol === "admin_club" &&
      listaTipo === "dinamica" &&
      filtrosConAlcanceInput.audienciaTipo !== "inscritos_torneo"
    ) {
      filtrosConAlcanceInput.audienciaTipo = "jugadores_club";
    }

    const filtros = await this.aplicarAlcanceRol(filtrosConAlcanceInput);

    const ids = await this.resolverIds({
      ...ctx,
      audienciaTipo: filtrosConAlcanceInput.audienciaTipo,
      filtros,
    });

    if (ids.length > COMUNICACIONES_MAX_DESTINATARIOS) {
      throw new Error(
        `La audiencia supera el máximo de ${COMUNICACIONES_MAX_DESTINATARIOS} destinatarios. Reducí los filtros o dividí la campaña.`,
      );
    }

    const sample = await this.obtenerSample(ids.slice(0, 5));

    let idsFinal = ids;
    if (ctx.listaId) {
      const { data: listaMeta } = await supabaseAdmin
        .from("comunicaciones_listas")
        .select("etiquetas")
        .eq("id", ctx.listaId)
        .maybeSingle();
      const etiquetas = (listaMeta?.etiquetas || []) as string[];
      if (etiquetas.includes("marketing")) {
        idsFinal = await this.excluirMenores(idsFinal);
      }
    }

    return {
      total: idsFinal.length,
      ids: idsFinal,
      sample: await this.obtenerSample(idsFinal.slice(0, 5)),
    };
  }

  /** Menores no reciben campañas con etiqueta marketing. */
  private static async excluirMenores(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const { data } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .in("id", ids)
      .eq("es_menor", false);
    return (data || []).map((p) => p.id);
  }

  private static inferirTipoDesdeFiltros(
    filtros: ComunicacionesFiltros,
  ): ComunicacionesAudienciaTipo {
    if (filtros.torneo_id) return "inscritos_torneo";
    if (filtros.asociacion_ids?.length) return "jugadores_asociacion";
    if (filtros.club_ids?.length) return "jugadores_club";
    if (filtros.roles?.includes("admin_provincial")) {
      return "admins_asociaciones";
    }
    if (filtros.provincias?.length) return "jugadores_provincia";
    return "jugadores_provincia";
  }

  /** Recorta IDs de lista manual al alcance del remitente. */
  private static async filtrarIdsPorAlcance(
    ctx: ResolverContext,
    ids: string[],
  ): Promise<string[]> {
    if (ids.length === 0) return [];

    const { actorRol, actorId } = ctx;

    if (actorRol === "superadmin" || actorRol === "admin_federacion") {
      return ids;
    }

    let query = supabaseAdmin.from("perfiles").select("id").in("id", ids);

    if (actorRol === "admin_club") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("club_id")
        .eq("id", actorId)
        .maybeSingle();
      if (!perfil?.club_id) return [];
      query = query.eq("club_id", perfil.club_id);
    } else if (actorRol === "admin_provincial") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("lugar_residencia")
        .eq("id", actorId)
        .maybeSingle();
      const provincia = (perfil?.lugar_residencia || "").trim();
      if (!provincia) return [];
      query = query.eq("lugar_residencia", provincia);
    }

    const { data } = await query;
    return uniqueIds((data || []).map((p) => p.id));
  }

  private static async aplicarAlcanceRol(
    ctx: ResolverContext,
  ): Promise<ComunicacionesFiltros> {
    const { actorId, actorRol, audienciaTipo, filtros } = ctx;
    const next: ComunicacionesFiltros = { ...filtros };

    if (audienciaTipo === "plataforma") {
      if (actorRol !== "superadmin" && actorRol !== "admin_federacion") {
        throw new Error(
          "Solo federación o superadmin pueden enviar a toda la plataforma.",
        );
      }
      next.solo_rol_usuario = true;
      return next;
    }

    if (actorRol === "admin_club") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("club_id")
        .eq("id", actorId)
        .maybeSingle();

      if (!perfil?.club_id) {
        throw new Error("Tu perfil no tiene club asignado.");
      }

      next.club_ids = [perfil.club_id];

      if (
        audienciaTipo !== "jugadores_club" &&
        audienciaTipo !== "lista" &&
        audienciaTipo !== "manual_ids" &&
        audienciaTipo !== "inscritos_torneo"
      ) {
        throw new Error(
          "Como admin de club solo podés comunicar a jugadores de tu club, listas propias o inscritos de un torneo.",
        );
      }

      return next;
    }

    if (actorRol === "admin_provincial") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("lugar_residencia")
        .eq("id", actorId)
        .maybeSingle();

      const provincia = (perfil?.lugar_residencia || "").trim();
      if (!provincia) {
        throw new Error(
          "Tu perfil no tiene provincia (lugar_residencia). Completalo antes de enviar.",
        );
      }

      // Forzar alcance a su provincia
      next.provincias = [provincia];

      if (next.asociacion_ids?.length) {
        const { data: asocs } = await supabaseAdmin
          .from("asociaciones")
          .select("id, provincia")
          .in("id", next.asociacion_ids);

        const invalidas = (asocs || []).filter(
          (a) =>
            (a.provincia || "").toLowerCase().trim() !==
            provincia.toLowerCase().trim(),
        );
        if (invalidas.length > 0 || (asocs || []).length !== next.asociacion_ids.length) {
          throw new Error(
            "Solo podés apuntar a asociaciones de tu provincia.",
          );
        }
      }

      if (next.club_ids?.length) {
        const { data: clubes } = await supabaseAdmin
          .from("clubes")
          .select("id, provincia")
          .in("id", next.club_ids);

        const invalidos = (clubes || []).filter(
          (c) =>
            (c.provincia || "").toLowerCase().trim() !==
            provincia.toLowerCase().trim(),
        );
        if (invalidos.length > 0 || (clubes || []).length !== next.club_ids.length) {
          throw new Error("Solo podés apuntar a clubes de tu provincia.");
        }
      }

      return next;
    }

    if (actorRol === "admin") {
      // Operativo: no plataforma; requiere filtros acotados
      if (
        !next.club_ids?.length &&
        !next.asociacion_ids?.length &&
        !next.provincias?.length &&
        !next.torneo_id &&
        audienciaTipo !== "lista" &&
        audienciaTipo !== "manual_ids" &&
        audienciaTipo !== "admins_asociaciones"
      ) {
        throw new Error(
          "Como admin genérico debés acotar por club, asociación, provincia, torneo o lista.",
        );
      }
    }

    return next;
  }

  private static async resolverIds(ctx: ResolverContext): Promise<string[]> {
    const { audienciaTipo, filtros } = ctx;

    switch (audienciaTipo) {
      case "plataforma":
        return this.resolverJugadores(filtros);

      case "admins_asociaciones":
        return this.resolverAdminsAsociaciones(filtros);

      case "jugadores_provincia":
        return this.resolverJugadores({
          ...filtros,
          solo_rol_usuario: true,
        });

      case "jugadores_asociacion":
        return this.resolverJugadoresAsociacion(filtros);

      case "jugadores_club":
        return this.resolverJugadoresClub(filtros);

      case "inscritos_torneo":
        return this.resolverInscritosTorneo(filtros);

      case "lista":
        // La resolución de listas se hace en resolver() antes de llegar acá.
        throw new Error(
          "La audiencia de tipo lista debe resolverse en el flujo principal.",
        );

      case "manual_ids":
        return this.resolverManualIds(filtros);

      default:
        throw new Error("Tipo de audiencia no soportado.");
    }
  }

  private static async resolverAdminsAsociaciones(
    filtros: ComunicacionesFiltros,
  ): Promise<string[]> {
    let query = supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("rol", "admin_provincial");

    if (filtros.provincias?.length) {
      query = query.in("lugar_residencia", filtros.provincias);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al resolver asociaciones: ${error.message}`);
    return uniqueIds((data || []).map((p) => p.id));
  }

  private static async resolverJugadores(
    filtros: ComunicacionesFiltros,
  ): Promise<string[]> {
    let query = supabaseAdmin.from("perfiles").select("id");

    if (filtros.solo_rol_usuario !== false) {
      query = query.eq("rol", "usuario");
    }

    if (filtros.roles?.length) {
      query = query.in("rol", filtros.roles);
    }

    if (filtros.provincias?.length) {
      query = query.in("lugar_residencia", filtros.provincias);
    }

    if (filtros.club_ids?.length) {
      query = query.in("club_id", filtros.club_ids);
    }

    if (filtros.categorias?.length) {
      query = query.in("categoria_padel", filtros.categorias);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al resolver jugadores: ${error.message}`);
    return uniqueIds((data || []).map((p) => p.id));
  }

  private static async resolverJugadoresAsociacion(
    filtros: ComunicacionesFiltros,
  ): Promise<string[]> {
    if (!filtros.asociacion_ids?.length) {
      throw new Error("Se requiere asociacion_ids para jugadores por asociación.");
    }

    const ids = new Set<string>();

    // Afiliados activos a la asociación
    const { data: afiliados, error: afilError } = await supabaseAdmin
      .from("afiliaciones")
      .select("usuario_id")
      .in("asociacion_id", filtros.asociacion_ids)
      .eq("estado", AFILIACION_ESTADOS.ACTIVO);

    if (afilError) {
      throw new Error(`Error al resolver afiliados: ${afilError.message}`);
    }

    for (const a of afiliados || []) {
      if (a.usuario_id) ids.add(a.usuario_id);
    }

    // Jugadores con club perteneciente a la asociación
    const { data: clubes } = await supabaseAdmin
      .from("clubes")
      .select("id")
      .in("asociacion_id", filtros.asociacion_ids);

    const clubIds = (clubes || []).map((c) => c.id);
    if (clubIds.length > 0) {
      let perfilesQuery = supabaseAdmin
        .from("perfiles")
        .select("id")
        .eq("rol", "usuario")
        .in("club_id", clubIds);

      if (filtros.provincias?.length) {
        perfilesQuery = perfilesQuery.in("lugar_residencia", filtros.provincias);
      }
      if (filtros.categorias?.length) {
        perfilesQuery = perfilesQuery.in("categoria_padel", filtros.categorias);
      }

      const { data: perfilesClub } = await perfilesQuery;
      for (const p of perfilesClub || []) {
        ids.add(p.id);
      }

      const { data: afilClub } = await supabaseAdmin
        .from("afiliaciones")
        .select("usuario_id")
        .in("club_id", clubIds)
        .eq("estado", AFILIACION_ESTADOS.ACTIVO);

      for (const a of afilClub || []) {
        if (a.usuario_id) ids.add(a.usuario_id);
      }
    }

    return [...ids];
  }

  private static async resolverJugadoresClub(
    filtros: ComunicacionesFiltros,
  ): Promise<string[]> {
    if (!filtros.club_ids?.length) {
      throw new Error("Se requiere club_ids para jugadores por club.");
    }

    const ids = new Set<string>();

    let perfilesQuery = supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("rol", "usuario")
      .in("club_id", filtros.club_ids);

    if (filtros.provincias?.length) {
      perfilesQuery = perfilesQuery.in("lugar_residencia", filtros.provincias);
    }
    if (filtros.categorias?.length) {
      perfilesQuery = perfilesQuery.in("categoria_padel", filtros.categorias);
    }

    const { data: perfiles, error } = await perfilesQuery;
    if (error) throw new Error(`Error al resolver club: ${error.message}`);
    for (const p of perfiles || []) ids.add(p.id);

    const { data: afiliados } = await supabaseAdmin
      .from("afiliaciones")
      .select("usuario_id")
      .in("club_id", filtros.club_ids)
      .eq("estado", AFILIACION_ESTADOS.ACTIVO);

    for (const a of afiliados || []) {
      if (a.usuario_id) ids.add(a.usuario_id);
    }

    return [...ids];
  }

  private static async resolverInscritosTorneo(
    filtros: ComunicacionesFiltros,
  ): Promise<string[]> {
    const torneoId = filtros.torneo_id;
    if (!torneoId) {
      throw new Error("Se requiere torneo_id para inscritos de torneo.");
    }

    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .select("usuario_id, usuario2_id, estado_pago")
      .eq("torneo_id", torneoId)
      .in("estado_pago", [
        FAP_ESTADOS_PAGO.CONFIRMADO,
        FAP_ESTADOS_PAGO.PENDIENTE,
      ]);

    if (error) {
      throw new Error(`Error al resolver inscritos: ${error.message}`);
    }

    // Preferimos confirmados; si no hay filtro estricto, incluimos pendientes también
    // para campañas de recordatorio de pago. El UI puede acotar luego.
    const ids = uniqueIds(
      (data || []).flatMap((row) => [row.usuario_id, row.usuario2_id]),
    );

    if (filtros.club_ids?.length || filtros.provincias?.length) {
      let q = supabaseAdmin.from("perfiles").select("id").in("id", ids);
      if (filtros.club_ids?.length) q = q.in("club_id", filtros.club_ids);
      if (filtros.provincias?.length) {
        q = q.in("lugar_residencia", filtros.provincias);
      }
      const { data: filtrados } = await q;
      return uniqueIds((filtrados || []).map((p) => p.id));
    }

    return ids;
  }

  private static async resolverManualIds(
    filtros: ComunicacionesFiltros,
  ): Promise<string[]> {
    if (!filtros.perfil_ids?.length) {
      throw new Error("Se requiere perfil_ids para audiencia manual.");
    }
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .in("id", filtros.perfil_ids);

    if (error) throw new Error(`Error al validar perfiles: ${error.message}`);
    return uniqueIds((data || []).map((p) => p.id));
  }

  private static async obtenerSample(
    ids: string[],
  ): Promise<AudienciaSamplePerfil[]> {
    if (ids.length === 0) return [];

    const { data } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, email, rol")
      .in("id", ids);

    return (data || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      email: p.email,
      rol: p.rol,
    }));
  }
}
