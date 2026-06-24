import { supabase } from "../config/supabase";

// DTO para el registro unificado FAP
export interface RegistroDTO {
  email: string;
  password: string;
  nombre_completo: string;
  telefono: string;
  dni: string;
  lugar_residencia: string;
  categoria_padel: string;
  lado_preferido: string;
}

export class AuthService {
  /**
   * Valida credenciales contra Supabase Auth y extrae el perfil con su rol FAP
   */
  static async login(email: string, password: string) {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      throw new Error("Credenciales inválidas o usuario no registrado.");
    }

    // Traer perfil con DNI y Residencia corregidos según el esquema FAP
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("id, nombre_completo, dni, lugar_residencia, rol, email")
      .eq("id", authData.user.id)
      .single();

    if (perfilError || !perfil) {
      throw new Error(
        "El usuario está autenticado pero no posee un perfil activo.",
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
    const { data, error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        // Guardamos la metadata obligatoria de la FAP
        data: {
          nombre_completo: datos.nombre_completo,
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

    return {
      exito: true,
      mensaje:
        "Usuario registrado. Verifique su correo electrónico para confirmar la cuenta.",
    };
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
}
