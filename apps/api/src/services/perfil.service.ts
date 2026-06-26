import { supabaseAdmin } from "../config/supabase";

export interface ActualizarPerfilDTO {
  nombre_completo?: string;
  telefono?: string;
  categoria_padel?: string;
  lado_preferido?: string;
  lugar_residencia?: string;
  dni?: string;
}

export class PerfilService {
  /**
   * Obtiene la ficha técnica completa de un jugador con sus licencias y afiliaciones
   */
  static async obtenerPerfilCompleto(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("🔴 ERROR EN OBTENER_PERFIL_COMPLETO:", error);
      throw new Error("Perfil de usuario no encontrado en la plataforma.");
    }

    return data;
  }

  /**
   * Actualiza los datos permitidos de la ficha del perfil del usuario logueado
   */
  static async actualizarDatosPerfil(
    userId: string,
    datos: ActualizarPerfilDTO,
  ) {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .update({
        nombre_completo: datos.nombre_completo,
        telefono: datos.telefono,
        categoria_padel: datos.categoria_padel,
        lado_preferido: datos.lado_preferido,
        lugar_residencia: datos.lugar_residencia,
        dni: datos.dni,
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(
        `No se pudieron actualizar los datos del perfil: ${error?.message}`,
      );
    }

    return data;
  }
}
