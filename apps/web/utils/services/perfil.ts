import { api } from "../api";
import { Perfil } from "../types";
import { isAxiosError } from "axios";

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
  dni: string; // Campo obligatorio FAP
  lugar_residencia: string; // Campo obligatorio FAP
  categoria_padel: string;
  lado_preferido: string;
}

export const PerfilService = {
  /**
   * Obtiene los datos del perfil logueado de forma controlada
   */
  async getMe(): Promise<Perfil | null> {
    try {
      const response = await api.get<Perfil>("/perfil/me");
      return response.data;
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
    const response = await api.put<Perfil>("/perfil/me", perfilData);
    return response.data;
  },

  /**
   * Consulta administrativa de perfiles de terceros por ID
   */
  async getById(id: string): Promise<Perfil> {
    const response = await api.get<Perfil>(`/perfil/${id}`);
    return response.data;
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
};
