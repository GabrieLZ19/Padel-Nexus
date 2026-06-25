import { api } from "../api";
import { Perfil } from "../types";
import { isAxiosError } from "axios";

export interface ApiResponse<T> {
  exito: boolean;
  data: T;
}

export interface AuthResponse {
  exito: boolean;
  mensaje: string;
  usuario: Perfil;
  token: string;
}

export interface RegistroPayload {
  email: string;
  password: string;
  nombre_completo: string;
  telefono: string;
  dni: string;
  lugar_residencia: string;
  categoria_padel: string;
  lado_preferido: string;
}

export const PerfilService = {
  /**
   * Obtiene los datos del perfil logueado y extrae la propiedad interna data
   */
  async getMe(): Promise<Perfil | null> {
    try {
      // Indicamos que Axios recibirá la estructura ApiResponse wrapping el Perfil
      const response = await api.get<ApiResponse<Perfil>>("/perfil/me");
      // Desempaquetamos de forma limpia para que Zustand guarde el Perfil puro
      return response.data.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Actualiza los datos de la ficha personal del jugador
   */
  async updateMe(perfilData: Partial<Perfil>): Promise<Perfil> {
    const response = await api.put<ApiResponse<Perfil>>(
      "/perfil/me",
      perfilData,
    );
    return response.data.data;
  },

  /**
   * Consulta administrativa de perfiles de terceros por ID
   */
  async getById(id: string): Promise<Perfil> {
    const response = await api.get<ApiResponse<Perfil>>(`/perfil/${id}`);
    return response.data.data;
  },

  /**
   * Despacha credenciales al backend para autenticación centralizada
   */
  async loginConEmail(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/perfil/login", {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Registra una nueva ficha de jugador federado con la estructura relacional FAP
   */
  async registrarUsuario(
    datos: RegistroPayload,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const response = await api.post<{ exito: boolean; mensaje: string }>(
      "/perfil/registro",
      datos,
    );
    return response.data;
  },

  /**
   * Solicita el link de blanqueo de contraseña mediante correo electrónico
   */
  async recuperarPassword(
    email: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const response = await api.post<{ exito: boolean; mensaje: string }>(
      "/perfil/recuperar-password",
      { email },
    );
    return response.data;
  },

  /**
   * Consolida la nueva contraseña utilizando el token de restablecimiento
   */
  async actualizarPassword(
    password: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const response = await api.post<{ exito: boolean; mensaje: string }>(
      "/perfil/actualizar-password",
      { password },
    );
    return response.data;
  },

  /**
   * Solicita la URL de Google OAuth al backend y redirige al navegador
   */
  async loginConGoogle(): Promise<void> {
    if (typeof window !== "undefined") {
      const response = await api.get<{ exito: boolean; url: string }>(
        "/perfil/google",
      );
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("La API no retornó una URL de redirección válida.");
      }
    }
  },

  /**
   * Envía el access_token del hash al backend para consolidar sesión FAP
   */
  async verificarTokenGoogle(accessToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/perfil/google/verificar", {
      accessToken,
    });
    return response.data;
  },
};
