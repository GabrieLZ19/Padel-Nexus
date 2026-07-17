import { supabaseAdmin } from "../config/supabase";

export interface FiscalPayload {
  nombre: string;
  apellido: string;
  dni: string;
  rango: 'Nacional' | 'Provincial' | 'Regional' | 'Local';
  entidad_carga?: string;
  usuario_id?: string | null;
}

export class FiscalService {
  static async listarFiscales() {
    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .select("*")
      .order("apellido", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async crearFiscal(datos: FiscalPayload) {
    // Buscar si el usuario ya existe con ese DNI para vincularlo de inmediato
    let usuarioId = datos.usuario_id || null;
    if (!usuarioId) {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("id")
        .eq("dni", datos.dni)
        .maybeSingle();
      if (perfil) {
        usuarioId = perfil.id;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .insert([
        {
          nombre: datos.nombre,
          apellido: datos.apellido,
          dni: datos.dni,
          rango: datos.rango,
          entidad_carga: datos.entidad_carga,
          usuario_id: usuarioId,
          activo: true,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear fiscal: ${error.message}`);
    return data;
  }

  static async buscarPorDni(dni: string) {
    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .select("*")
      .eq("dni", dni)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  static async obtenerFiscalesTorneo(torneoId: string) {
    const { data, error } = await supabaseAdmin
      .from("torneo_fiscales")
      .select("fiscal_id, fiscales(*)")
      .eq("torneo_id", torneoId);

    if (error) throw new Error(error.message);
    return (data || []).map((tf: any) => tf.fiscales).filter(Boolean);
  }

  static async asignarFiscalesTorneo(torneoId: string, dnis: string[]) {
    if (!dnis || dnis.length === 0) return [];

    // 1. Buscar los fiscales por DNI
    const { data: fiscales, error: errF } = await supabaseAdmin
      .from("fiscales")
      .select("id, dni")
      .in("dni", dnis);

    if (errF) throw new Error(errF.message);
    if (!fiscales || fiscales.length === 0) {
      throw new Error("No se encontraron fiscales con los DNI provistos.");
    }

    // 2. Limpiar asignaciones previas
    await supabaseAdmin
      .from("torneo_fiscales")
      .delete()
      .eq("torneo_id", torneoId);

    // 3. Insertar nuevas asignaciones
    const inserts = fiscales.map((f) => ({
      torneo_id: torneoId,
      fiscal_id: f.id,
    }));

    const { error: errIns } = await supabaseAdmin
      .from("torneo_fiscales")
      .insert(inserts);

    if (errIns) throw new Error(errIns.message);
    return fiscales;
  }
}
