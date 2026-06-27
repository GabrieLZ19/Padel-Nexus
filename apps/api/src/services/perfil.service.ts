import { supabaseAdmin } from "../config/supabase";

export interface ActualizarPerfilDTO {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  categoria_padel?: string;
  lado_preferido?: string;
  lugar_residencia?: string;
  dni?: string;
  avatar_url?: string;
}

export class PerfilService {
  /**
   * Obtiene la ficha técnica completa de un jugador con sus licencias y afiliaciones
   */
  static async obtenerPerfilCompleto(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select("*, licencias:licencias!fk_licencias_usuario(*), afiliaciones:afiliaciones!fk_afiliaciones_usuario(*)")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("🔴 ERROR EN OBTENER_PERFIL_COMPLETO:", error);
      throw new Error("Perfil de usuario no encontrado en la plataforma.");
    }

    // Mapear fecha_vencimiento a vencimiento para cumplir con la documentación de Afiliaciones Múltiples (1:N)
    if (data.afiliaciones && Array.isArray(data.afiliaciones)) {
      data.afiliaciones = data.afiliaciones.map((af: any) => ({
        ...af,
        vencimiento: af.fecha_vencimiento,
      }));
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
    const capitalizarTexto = (texto?: string) => {
      if (!texto) return undefined;
      return texto
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    const nombreCapitalizado = capitalizarTexto(datos.nombre);
    const apellidoCapitalizado = capitalizarTexto(datos.apellido);

    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .update({
        nombre: nombreCapitalizado !== undefined ? nombreCapitalizado : undefined,
        apellido: apellidoCapitalizado !== undefined ? apellidoCapitalizado : undefined,
        telefono: datos.telefono,
        categoria_padel: datos.categoria_padel,
        lado_preferido: datos.lado_preferido,
        lugar_residencia: datos.lugar_residencia,
        dni: datos.dni,
        avatar_url: datos.avatar_url,
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

  /**
   * Sube una foto de perfil en formato base64 y la vincula al usuario
   */
  static async actualizarAvatar(userId: string, base64Data: string): Promise<string> {
    // 1. Validamos formato base64
    const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Formato de imagen base64 inválido.");
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, "base64");
    
    const ext = mimeType.split("/")[1] || "png";
    const fileName = `avatar_${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    // 2. Traer el perfil actual para eliminar el avatar anterior si existe
    const { data: perfilActual } = await supabaseAdmin
      .from("perfiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (perfilActual?.avatar_url) {
      try {
        const parts = perfilActual.avatar_url.split("/avatars/");
        if (parts.length === 2) {
          await supabaseAdmin.storage.from("avatars").remove([parts[1]]);
        }
      } catch (err) {
        console.error("⚠️ No se pudo eliminar el avatar anterior:", err);
      }
    }

    // 3. Subir el nuevo avatar
    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Error al subir imagen al storage: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // 4. Actualizar la tabla perfiles
    const { error: dbError } = await supabaseAdmin
      .from("perfiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (dbError) {
      throw new Error(`Error al guardar la URL del avatar en base de datos: ${dbError.message}`);
    }

    return publicUrl;
  }

  /**
   * Elimina la foto de perfil del usuario del storage y de la base de datos
   */
  static async eliminarAvatar(userId: string): Promise<void> {
    const { data: perfilActual, error: fetchError } = await supabaseAdmin
      .from("perfiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (fetchError || !perfilActual) {
      throw new Error("Perfil de usuario no encontrado.");
    }

    if (perfilActual.avatar_url) {
      const parts = perfilActual.avatar_url.split("/avatars/");
      if (parts.length === 2) {
        const { error: removeError } = await supabaseAdmin.storage
          .from("avatars")
          .remove([parts[1]]);
        
        if (removeError) {
          console.error("⚠️ Error al eliminar archivo de storage:", removeError.message);
        }
      }
    }

    const { error: dbError } = await supabaseAdmin
      .from("perfiles")
      .update({ avatar_url: null })
      .eq("id", userId);

    if (dbError) {
      throw new Error(`Error al remover el avatar de la base de datos: ${dbError.message}`);
    }
  }
}
