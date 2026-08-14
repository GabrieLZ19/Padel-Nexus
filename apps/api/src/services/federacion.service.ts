import { supabaseAdmin } from "../config/supabase";

export interface FederacionPayload {
  nombre: string;
  sigla?: string;
  pais?: string;
  estado?: "activo" | "inactivo";
  descripcion?: string;
  logo_url?: string | null;
}

export class FederacionService {
  static async listar() {
    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const federaciones = data || [];
    if (federaciones.length === 0) return [];

    const ids = federaciones.map((f) => f.id);
    const { data: asociaciones } = await supabaseAdmin
      .from("asociaciones")
      .select("id, federacion_id")
      .in("federacion_id", ids);

    const countPorFederacion = new Map<string, number>();
    (asociaciones || []).forEach((a) => {
      if (!a.federacion_id) return;
      countPorFederacion.set(
        a.federacion_id,
        (countPorFederacion.get(a.federacion_id) || 0) + 1,
      );
    });

    return federaciones.map((f) => ({
      ...f,
      asociaciones_count: countPorFederacion.get(f.id) || 0,
    }));
  }

  static async obtenerPorId(id: string) {
    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const { data: asociaciones } = await supabaseAdmin
      .from("asociaciones")
      .select("id, nombre, sigla, provincia, localidad, estado, tipo")
      .eq("federacion_id", id)
      .order("nombre", { ascending: true });

    return {
      ...data,
      asociaciones: asociaciones || [],
      asociaciones_count: (asociaciones || []).length,
    };
  }

  static async crear(datos: FederacionPayload) {
    if (!datos.nombre?.trim()) {
      throw new Error("El nombre de la federación es obligatorio.");
    }

    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .insert([
        {
          nombre: datos.nombre.trim(),
          sigla: datos.sigla?.trim() || datos.nombre.trim().slice(0, 4).toUpperCase(),
          pais: datos.pais?.trim() || "Argentina",
          estado: datos.estado || "activo",
          descripcion: datos.descripcion?.trim() || null,
          logo_url: datos.logo_url || null,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear federación: ${error.message}`);
    return data;
  }

  static async actualizar(id: string, datos: Partial<FederacionPayload>) {
    const updates: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };
    if (datos.nombre !== undefined) updates.nombre = datos.nombre.trim();
    if (datos.sigla !== undefined) updates.sigla = datos.sigla.trim();
    if (datos.pais !== undefined) updates.pais = datos.pais.trim();
    if (datos.descripcion !== undefined) updates.descripcion = datos.descripcion.trim() || null;
    if (datos.logo_url !== undefined) updates.logo_url = datos.logo_url;

    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar federación: ${error.message}`);
    return data;
  }

  static async cambiarEstado(id: string, estado: "activo" | "inactivo") {
    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .update({ estado, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al cambiar estado de la federación: ${error.message}`);
    return data;
  }

  static async resolveFapId(): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from("federaciones")
      .select("id")
      .ilike("sigla", "FAP")
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }
}
