import { supabaseAdmin } from "../config/supabase";
import {
  normalizarEtiquetas,
  type ComunicacionesEtiqueta,
} from "../constants/comunicaciones";
import { normalizarPerfilLicencias } from "../utils/estadoLicencia";
import {
  orBusquedaContactosAdmin,
  terminoIlikePostgrest,
} from "../utils/postgrestBusqueda";

export type FiltroContactoCrm = "todos" | "con_licencia" | "sin_licencia";

export interface CrmContactosResumen {
  registrados: number;
  con_licencia: number;
  sin_licencia: number;
}

export class CrmContactosService {
  static async obtenerResumen(): Promise<CrmContactosResumen> {
    const [registradosRes, licenciasRes] = await Promise.all([
      supabaseAdmin
        .from("perfiles")
        .select("id", { count: "exact", head: true })
        .eq("rol", "usuario"),
      supabaseAdmin.from("licencias").select("usuario_id"),
    ]);

    const registrados = registradosRes.count ?? 0;
    const conLicencia = new Set(
      (licenciasRes.data || [])
        .map((row) => String(row.usuario_id || ""))
        .filter(Boolean),
    ).size;

    return {
      registrados,
      con_licencia: conLicencia,
      sin_licencia: Math.max(0, registrados - conLicencia),
    };
  }

  static async listar(
    page: number,
    limit: number,
    search?: string,
    filtro: FiltroContactoCrm = "todos",
    etiqueta?: ComunicacionesEtiqueta,
  ) {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const licenciasEmbed =
      filtro === "con_licencia"
        ? "licencias:licencias!fk_licencias_usuario!inner(id, estado, nro_licencia, fecha_vencimiento)"
        : "licencias:licencias!fk_licencias_usuario(id, estado, nro_licencia, fecha_vencimiento)";

    let query = supabaseAdmin
      .from("perfiles")
      .select(
        `id, nombre, apellido, email, dni, telefono, categoria_padel, lugar_residencia, created_at, etiquetas_contacto, ${licenciasEmbed}`,
        { count: "exact" },
      )
      .eq("rol", "usuario")
      .order("created_at", { ascending: false });

    if (search?.trim()) {
      const quoted = terminoIlikePostgrest(search);
      query = query.or(orBusquedaContactosAdmin(quoted));
    }

    if (etiqueta) {
      query = query.contains("etiquetas_contacto", [etiqueta]);
    }

    if (filtro === "sin_licencia") {
      const idsConLicencia = await CrmContactosService.idsConLicencia();
      if (idsConLicencia.length > 0) {
        query = query.not(
          "id",
          "in",
          `(${idsConLicencia.map((id) => `"${id}"`).join(",")})`,
        );
      }
    }

    const { data, error, count } = await query.range(from, to);
    if (error) {
      throw new Error(error.message || "Error al listar contactos CRM.");
    }

    const rows = (data || []).map((perfil) =>
      normalizarPerfilLicencias(perfil as Record<string, unknown>),
    );

    return {
      data: rows,
      total: count ?? 0,
      resumen: await CrmContactosService.obtenerResumen(),
    };
  }

  static async actualizarEtiquetas(
    perfilId: string,
    etiquetas: ComunicacionesEtiqueta[],
  ) {
    const normalizadas = normalizarEtiquetas(etiquetas);
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .update({ etiquetas_contacto: normalizadas })
      .eq("id", perfilId)
      .eq("rol", "usuario")
      .select("id, etiquetas_contacto")
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "No se pudieron guardar las etiquetas.");
    }
    if (!data) {
      throw new Error("Contacto no encontrado.");
    }
    return data;
  }

  private static async idsConLicencia(): Promise<string[]> {
    const ids = new Set<string>();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("licencias")
        .select("usuario_id")
        .range(from, from + pageSize - 1);
      if (error) {
        throw new Error(error.message || "Error al filtrar contactos.");
      }
      for (const row of data || []) {
        const id = String(row.usuario_id || "");
        if (id) ids.add(id);
      }
      if (!data || data.length < pageSize) break;
    }
    return [...ids];
  }
}
