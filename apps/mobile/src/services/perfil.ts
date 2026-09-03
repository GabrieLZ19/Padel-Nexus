import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type {
  AuthResponse,
  Perfil,
  PerfilPublico,
  RegistroPayload,
} from "@/src/types/user.types";

interface ApiResponse<T> {
  exito: boolean;
  data: T;
}

interface LoginApiBody {
  exito: boolean;
  mensaje?: string;
  usuario?: Perfil;
  token?: string;
  data?: {
    usuario: Perfil;
    token: string;
  };
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "El servidor no responde. Puede estar iniciando; esperá unos segundos e intentá de nuevo.";
    }
    const data = error.response.data as
      | { error?: string; message?: string; mensaje?: string }
      | undefined;
    return data?.error || data?.message || data?.mensaje || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function parseLoginBody(body: LoginApiBody): AuthResponse {
  const usuario = body.data?.usuario ?? body.usuario;
  const token = body.data?.token ?? body.token;

  if (!usuario || !token) {
    throw new Error("Respuesta de login inválida del servidor.");
  }

  return {
    exito: body.exito,
    mensaje: body.mensaje ?? "Sesión iniciada.",
    usuario,
    token,
  };
}

export const PerfilService = {
  async getMe(): Promise<Perfil | null> {
    try {
      const response = await api.get<ApiResponse<Perfil>>("/perfil/me");
      return response.data.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        return null;
      }
      throw new Error(getErrorMessage(error, "No se pudo cargar el perfil."));
    }
  },

  async getPublico(userId: string): Promise<PerfilPublico | null> {
    try {
      const response = await api.get<ApiResponse<PerfilPublico>>(
        `/perfil/publico/${userId}`,
      );
      return response.data.data ?? null;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(
        getErrorMessage(error, "No se pudo cargar el perfil del jugador."),
      );
    }
  },

  async updateMe(perfilData: Partial<Perfil>): Promise<Perfil> {
    try {
      const response = await api.put<ApiResponse<Perfil>>(
        "/perfil/me",
        perfilData,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo actualizar el perfil."));
    }
  },

  async subirAvatar(avatarBase64: string): Promise<string> {
    try {
      const response = await api.post<ApiResponse<{ avatar_url: string }>>(
        "/perfil/avatar",
        { avatar_base64: avatarBase64 },
      );
      return response.data.data.avatar_url;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo subir el avatar."));
    }
  },

  async loginConEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post<LoginApiBody>("/perfil/login", {
        email: email.trim(),
        password,
      });
      return parseLoginBody(response.data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Email o contraseña incorrectos."));
    }
  },

  async registrarUsuario(
    payload: RegistroPayload,
  ): Promise<{ exito: boolean; mensaje: string }> {
    try {
      const response = await api.post<{ exito: boolean; mensaje: string }>(
        "/perfil/registro",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo crear la cuenta."));
    }
  },

  async recuperarPassword(email: string): Promise<void> {
    try {
      await api.post("/perfil/recuperar-password", { email: email.trim() });
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo enviar el correo de recuperación."),
      );
    }
  },

  async obtenerUrlGoogle(): Promise<string> {
    try {
      const response = await api.get<{ exito: boolean; url: string }>(
        "/perfil/google",
      );
      if (!response.data.url) {
        throw new Error("URL de Google vacía.");
      }
      return response.data.url;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo iniciar sesión con Google."),
      );
    }
  },

  async registrarPushToken(expoPushToken: string): Promise<void> {
    try {
      await api.post("/perfil/push-token", { token: expoPushToken });
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo registrar notificaciones push."),
      );
    }
  },
};
