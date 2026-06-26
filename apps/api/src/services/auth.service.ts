import { supabase, supabaseAdmin } from "../config/supabase";
import { env } from "../config/env.config";

// DTO para el registro unificado FAP
export interface RegistroDTO {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  lugar_residencia: string;
  categoria_padel: string;
  lado_preferido: string;
  avatar_base64?: string;
}

export class AuthService {
  /**
   * Valida credenciales contra Supabase Auth y extrae el perfil con su rol FAP
   */
  static async login(email: string, password: string) {
    // 1. Validamos la sesión con el cliente estándar (muta su contexto interno)
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      throw new Error("Credenciales inválidas o usuario no registrado.");
    }

    // 2. Consultamos la base de datos con el cliente Administrador Seguro
    // Al estar aislado, ignora el RLS de forma directa sin caer en bucles de Postgres
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, dni, lugar_residencia, rol, email, ranking_nacional, ranking_provincial")
      .eq("id", authData.user.id)
      .single();

    if (perfilError || !perfil) {
      console.error("🔴 MOTIVO DEL REBOTE:", perfilError);
      throw new Error(
        "Error crítico de sincronización: El perfil asignado no se encuentra activo.",
      );
    }

    return {
      usuario: perfil,
      token: authData.session?.access_token,
    };
  }

  /**
   * Registra un nuevo usuario en Supabase Auth y crea su perfil relacional FAP
   */
  static async registrar(datos: RegistroDTO) {
    const capitalizarTexto = (texto: string) => {
      if (!texto) return "";
      return texto
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    const nombreCapitalizado = capitalizarTexto(datos.nombre);
    const apellidoCapitalizado = capitalizarTexto(datos.apellido);

    const { data, error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        // Guardamos la metadata obligatoria de la FAP
        data: {
          nombre: nombreCapitalizado,
          apellido: apellidoCapitalizado,
          telefono: datos.telefono,
          dni: datos.dni,
          lugar_residencia: datos.lugar_residencia,
          categoria_padel: datos.categoria_padel,
          lado_preferido: datos.lado_preferido,
        },
      },
    });

    if (error) {
      throw new Error(
        `Error en el registro de autenticación: ${error.message}`,
      );
    }

    // Subir avatar si se proporcionó en base64
    if (datos.avatar_base64 && data.user) {
      try {
        const userId = data.user.id;
        const avatarUrl = await this.subirAvatarBase64(userId, datos.avatar_base64);
        
        // Actualizar el perfil recién creado en perfiles con la URL
        await supabaseAdmin
          .from("perfiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", userId);
      } catch (uploadError: any) {
        console.error("🔴 Error al subir avatar en registro:", uploadError.message || uploadError);
      }
    }

    return {
      exito: true,
      mensaje:
        "Usuario registrado. Verifique su correo electrónico para confirmar la cuenta.",
    };
  }

  /**
   * Sube una foto de perfil en formato base64 a Supabase Storage con privilegios de admin
   */
  private static async subirAvatarBase64(userId: string, base64Data: string): Promise<string> {
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

    const { error } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return publicUrl;
  }

  /**
   * Solicita el envío de un correo de recuperación de contraseña
   */
  static async solicitarRecuperacionPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new Error(`Error al solicitar recuperación: ${error.message}`);
    }

    return { exito: true, mensaje: "Correo de recuperación enviado." };
  }

  /**
   * Actualiza la contraseña del usuario utilizando el token de sesión activo (obtenido del link del correo)
   */
  static async actualizarPassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw new Error(`Error al actualizar contraseña: ${error.message}`);
    }

    return { exito: true, mensaje: "Contraseña actualizada correctamente." };
  }

  /**
   * Genera la URL de autorización oficial de Google usando signInWithOAuth
   */
  static async obtenerUrlGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        //  Forzamos a Supabase a redirigir a tu nueva pantalla procesadora del cliente
        redirectTo: `${env.FRONTEND_URL || "http://localhost:3000"}/callback`,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error || !data?.url) {
      throw new Error(
        `No se pudo inicializar Google OAuth: ${error?.message || "URL vacía"}`,
      );
    }

    return data.url;
  }

  /**
   * Recibe el "code" temporal de Google OAuth y lo cambia por los tokens de sesión
   */
  static async cambiarCodigoPorSesion(code: string) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session || !data.user) {
      throw new Error(
        `Fallo en el intercambio de código de Google: ${error?.message}`,
      );
    }

    // Buscamos su perfil unificado en la base
    let { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, dni, lugar_residencia, rol, email, ranking_nacional, ranking_provincial")
      .eq("id", data.user.id)
      .single();

    // Fallback por si es un registro nuevo vía Google
    if (perfilError || !perfil) {
      const { data: nuevoPerfil, error: insertError } = await supabaseAdmin
        .from("perfiles")
        .insert({
          id: data.user.id,
          nombre: (data.user.user_metadata?.full_name || "Jugador Google").split(" ")[0],
          apellido: (data.user.user_metadata?.full_name || "").includes(" ") ? (data.user.user_metadata?.full_name || "").split(" ").slice(1).join(" ") : "",
          email: data.user.email,
          rol: "usuario",
          lugar_residencia: "A completar",
          dni: "A completar",
        })
        .select("id, nombre, apellido, dni, lugar_residencia, rol, email, ranking_nacional, ranking_provincial")
        .single();

      if (insertError || !nuevoPerfil) {
        throw new Error("No se pudo inicializar la ficha de perfil técnica.");
      }
      perfil = nuevoPerfil;
    }

    return {
      usuario: perfil,
      token: data.session.access_token,
    };
  }

  /**
   * Recibe el token extraído del cliente, valida autenticidad y extrae la ficha técnica FAP
   */
  static async verificarTokenGoogle(accessToken: string) {
    // 1. Validamos usando el cliente de usuario (anon) para que el JWT se verifique de forma nativa
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      throw new Error(
        "El token de Google OAuth provisto no es válido o ya caducó.",
      );
    }

    // 2. Buscamos su perfil relacional
    let { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, nombre, apellido, dni, lugar_residencia, rol, email, categoria_padel, lado_preferido, ranking_nacional, ranking_provincial",
      )
      .eq("id", user.id)
      .single();

    // Si es un registro nuevo o el RLS bloquea la lectura inicial, usamos el canal de respaldo administrativo para asegurar la creación de la ficha
    if (perfilError || !perfil) {
      const { data: nuevoPerfil, error: insertError } = await supabaseAdmin
        .from("perfiles")
        .insert({
          id: user.id,
          nombre: (user.user_metadata?.full_name || "Jugador Google").split(" ")[0],
          apellido: (user.user_metadata?.full_name || "").includes(" ") ? (user.user_metadata?.full_name || "").split(" ").slice(1).join(" ") : "",
          email: user.email,
          rol: "usuario",
          lugar_residencia: "La Rioja",
          dni: "A completar",
          categoria_padel: "S/C",
          lado_preferido: "S/C",
        })
        .select(
          "id, nombre, apellido, dni, lugar_residencia, rol, email, categoria_padel, lado_preferido, ranking_nacional, ranking_provincial",
        )
        .single();

      if (insertError || !nuevoPerfil) {
        throw new Error(
          "Se autenticó en Google pero falló la inicialización del Perfil.",
        );
      }
      perfil = nuevoPerfil;
    }

    return {
      usuario: perfil,
      token: accessToken,
    };
  }
}
