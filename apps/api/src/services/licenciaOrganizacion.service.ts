import { supabaseAdmin } from "../config/supabase";
import {
  LICENCIA_CONFIG_DEFAULT,
  LicenciaOrganizacionConfig,
  calcularFechaVencimientoLicencia,
  descripcionVigenciaLicencia,
  mergeLicenciaConfig,
  mapRowToLicenciaConfig,
  type LicenciaVigenciaModo,
} from "../utils/licenciaConfig";

export interface LicenciaConfigPayload {
  precio_anual?: number;
  vigencia_modo?: LicenciaVigenciaModo;
  vencimiento_mes?: number | null;
  vencimiento_dia?: number | null;
  vigencia_meses?: number;
}

function toDbPayload(payload: LicenciaConfigPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (payload.precio_anual !== undefined) {
    out.licencia_precio_anual = Math.max(0, Number(payload.precio_anual));
  }
  if (payload.vigencia_modo !== undefined) {
    out.licencia_vigencia_modo = payload.vigencia_modo;
  }
  if (payload.vencimiento_mes !== undefined) {
    out.licencia_vencimiento_mes = payload.vencimiento_mes;
  }
  if (payload.vencimiento_dia !== undefined) {
    out.licencia_vencimiento_dia = payload.vencimiento_dia;
  }
  if (payload.vigencia_meses !== undefined) {
    out.licencia_vigencia_meses = payload.vigencia_meses;
  }
  return out;
}

export class LicenciaOrganizacionService {
  static async obtenerConfigFederacion(federacionId: string) {
    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .select(
        "licencia_precio_anual, licencia_vigencia_modo, licencia_vencimiento_mes, licencia_vencimiento_dia, licencia_vigencia_meses",
      )
      .eq("id", federacionId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const config = mapRowToLicenciaConfig(data, "federacion");
    return {
      config,
      descripcion_vigencia: descripcionVigenciaLicencia(config),
    };
  }

  static async actualizarConfigFederacion(
    federacionId: string,
    payload: LicenciaConfigPayload,
  ) {
    const updates = toDbPayload(payload);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .update(updates)
      .eq("id", federacionId)
      .select(
        "id, nombre, licencia_precio_anual, licencia_vigencia_modo, licencia_vencimiento_mes, licencia_vencimiento_dia, licencia_vigencia_meses",
      )
      .single();

    if (error) throw new Error(error.message);
    const config = mapRowToLicenciaConfig(data, "federacion");
    return {
      ...data,
      config,
      descripcion_vigencia: descripcionVigenciaLicencia(config),
    };
  }

  static async obtenerConfigAsociacion(asociacionId: string) {
    const { data: asoc, error } = await supabaseAdmin
      .from("asociaciones")
      .select(
        "id, nombre, federacion_id, licencia_precio_anual, licencia_vigencia_modo, licencia_vencimiento_mes, licencia_vencimiento_dia, licencia_vigencia_meses",
      )
      .eq("id", asociacionId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!asoc) throw new Error("Asociación no encontrada");

    let federacion = null;
    if (asoc.federacion_id) {
      const { data } = await supabaseAdmin
        .from("federaciones")
        .select(
          "licencia_precio_anual, licencia_vigencia_modo, licencia_vencimiento_mes, licencia_vencimiento_dia, licencia_vigencia_meses",
        )
        .eq("id", asoc.federacion_id)
        .maybeSingle();
      federacion = data;
    }

    const config = mergeLicenciaConfig(federacion, asoc);
    return {
      asociacion_id: asoc.id,
      federacion_id: asoc.federacion_id,
      config,
      descripcion_vigencia: descripcionVigenciaLicencia(config),
      hereda_de_federacion: config.origen === "federacion",
    };
  }

  static async actualizarConfigAsociacion(
    asociacionId: string,
    payload: LicenciaConfigPayload,
  ) {
    const updates = toDbPayload(payload);
    updates.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("asociaciones")
      .update(updates)
      .eq("id", asociacionId);

    if (error) throw new Error(error.message);

    return LicenciaOrganizacionService.obtenerConfigAsociacion(asociacionId);
  }

  static async resolverConfigParaLicencia(licencia: {
    datos_solicitud?: Record<string, unknown> | null;
    asociacion_id?: string | null;
    club_id?: string | null;
  }): Promise<LicenciaOrganizacionConfig> {
    let asociacionId = licencia.asociacion_id ?? null;
    const datos = licencia.datos_solicitud || {};
    const clubId =
      (typeof datos.club_id === "string" ? datos.club_id : null) ||
      licencia.club_id ||
      null;
    const provincia =
      typeof datos.provincia === "string" ? datos.provincia.trim() : null;

    if (!asociacionId && clubId) {
      const { data: club } = await supabaseAdmin
        .from("clubes")
        .select("asociacion_id")
        .eq("id", clubId)
        .maybeSingle();
      asociacionId = club?.asociacion_id ?? null;
    }

    if (!asociacionId && provincia) {
      const { data: asoc } = await supabaseAdmin
        .from("asociaciones")
        .select("id")
        .ilike("provincia", provincia)
        .limit(1)
        .maybeSingle();
      asociacionId = asoc?.id ?? null;
    }

    if (asociacionId) {
      const resolved =
        await LicenciaOrganizacionService.obtenerConfigAsociacion(asociacionId);
      return resolved.config;
    }

    const { data: fap } = await supabaseAdmin
      .from("federaciones")
      .select(
        "licencia_precio_anual, licencia_vigencia_modo, licencia_vencimiento_mes, licencia_vencimiento_dia, licencia_vigencia_meses",
      )
      .ilike("sigla", "FAP")
      .limit(1)
      .maybeSingle();

    if (fap) {
      return mapRowToLicenciaConfig(fap, "federacion");
    }

    return { ...LICENCIA_CONFIG_DEFAULT };
  }

  static async calcularVencimientoParaLicencia(
    licencia: Parameters<
      typeof LicenciaOrganizacionService.resolverConfigParaLicencia
    >[0],
    fechaReferencia?: Date,
  ): Promise<string> {
    const config =
      await LicenciaOrganizacionService.resolverConfigParaLicencia(licencia);
    return calcularFechaVencimientoLicencia(config, fechaReferencia);
  }

  static async resolverContextoAdmin(usuarioId: string, rol: string) {
    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, lugar_residencia")
      .eq("id", usuarioId)
      .maybeSingle();

    if (rol === "admin_provincial") {
      const provincia = perfil?.lugar_residencia?.trim();
      if (!provincia) {
        throw new Error(
          "Tu perfil no tiene provincia asignada. Contactá a la federación.",
        );
      }

      const { data: asoc } = await supabaseAdmin
        .from("asociaciones")
        .select("id, nombre, provincia")
        .ilike("provincia", provincia)
        .limit(1)
        .maybeSingle();

      if (!asoc) {
        throw new Error(
          `No se encontró una asociación para la provincia ${provincia}.`,
        );
      }

      const configData =
        await LicenciaOrganizacionService.obtenerConfigAsociacion(asoc.id);

      return {
        tipo: "asociacion" as const,
        entidad_id: asoc.id,
        entidad_nombre: asoc.nombre,
        subtitulo: `Asociación provincial · ${asoc.provincia}`,
        puede_editar: true,
        ...configData,
      };
    }

    const { data: fap } = await supabaseAdmin
      .from("federaciones")
      .select("id, nombre, sigla")
      .ilike("sigla", "FAP")
      .limit(1)
      .maybeSingle();

    if (!fap) {
      throw new Error("No se encontró la federación FAP en el sistema.");
    }

    const configData =
      await LicenciaOrganizacionService.obtenerConfigFederacion(fap.id);

    return {
      tipo: "federacion" as const,
      entidad_id: fap.id,
      entidad_nombre: fap.nombre,
      subtitulo: "Federación nacional · aplica a todo el circuito FAP",
      puede_editar: rol === "superadmin" || rol === "admin_federacion",
      ...configData,
    };
  }

  static async actualizarConfigDesdeContexto(
    usuarioId: string,
    rol: string,
    payload: LicenciaConfigPayload,
  ) {
    const contexto = await LicenciaOrganizacionService.resolverContextoAdmin(
      usuarioId,
      rol,
    );

    if (!contexto.puede_editar) {
      throw new Error("No tenés permisos para editar esta configuración.");
    }

    if (contexto.tipo === "asociacion") {
      return LicenciaOrganizacionService.actualizarConfigAsociacion(
        contexto.entidad_id,
        payload,
      );
    }

    return LicenciaOrganizacionService.actualizarConfigFederacion(
      contexto.entidad_id,
      payload,
    );
  }
}
