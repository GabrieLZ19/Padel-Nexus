import { supabase } from "../config/supabase";

export class LicenciaService {
  static async obtenerLicencias(page: number, limit: number, search?: string) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("licencias")
      .select(
        "*, perfiles(nombre_completo, telefono, email, categoria_padel)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (search) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `nro_licencia.ilike.${term},perfiles.nombre_completo.ilike.${term},perfiles.email.ilike.${term}`,
      );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error("Error al listar licencias");
    return { data: data || [], total: count || 0 };
  }

  static async obtenerPorUsuario(usuario_id: string) {
    const { data, error } = await supabase
      .from("licencias")
      .select("*")
      .eq("usuario_id", usuario_id)
      .single();

    if (error || !data)
      throw new Error("Licencia no encontrada para este usuario.");
    return data;
  }

  static async crearLicencia(
    usuario_id: string,
    nro_licencia: string,
    estado: string,
  ) {
    const { data, error } = await supabase
      .from("licencias")
      .insert([
        {
          usuario_id,
          nro_licencia,
          estado,
          fecha_emision: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async renovar(id: string) {
    const vencimiento = new Date();
    vencimiento.setFullYear(vencimiento.getFullYear() + 1);

    const { data, error } = await supabase
      .from("licencias")
      .update({
        fecha_vencimiento: vencimiento.toISOString(),
        estado: "Activa",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async verificar(usuario_id: string) {
    const { data, error } = await supabase
      .from("licencias")
      .select(
        "estado, nro_licencia, fecha_vencimiento, perfiles(nombre_completo)",
      )
      .eq("usuario_id", usuario_id)
      .single();

    if (error || !data) throw new Error("Licencia no encontrada");

    // Lógica dinámica de vencimiento
    if (
      new Date(data.fecha_vencimiento) < new Date() &&
      data.estado === "Activa"
    ) {
      data.estado = "Vencida";
    }
    return data;
  }

  static async actualizarEstado(id: string, estado: string) {
    const { data, error } = await supabase
      .from("licencias")
      .update({ estado })
      .eq("id", id)
      .select()
      .single();

    if (error || !data)
      throw new Error(
        "No se encontró la licencia para actualizar o el estado es inválido.",
      );
    return data;
  }

  static async solicitar(usuario_id: string, datos: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("licencias")
      .insert([
        {
          usuario_id,
          estado: "Pendiente",
          nro_licencia: `PAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          datos_solicitud: datos,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
