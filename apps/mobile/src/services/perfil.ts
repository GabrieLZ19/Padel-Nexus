import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type {
  AuthResponse,
  Perfil,
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
      return "No se pudo conectar con el servidor. Verificá que la API esté corriendo en el puerto 4000 y que el celular esté en la misma red Wi‑Fi.";
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
};
