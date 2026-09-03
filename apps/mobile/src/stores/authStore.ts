import { Image } from "expo-image";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { create } from "zustand";

import {
  clearAccessToken,
  getAccessToken,
  getCachedUser,
  setAccessToken,
  setCachedUser,
} from "@/src/lib/secureToken";
import { PerfilService } from "@/src/services/perfil";
import type { Perfil, RegistroPayload } from "@/src/types/user.types";

interface AuthState {
  usuario: Perfil | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (payload: RegistroPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUsuario: (usuario: Perfil | null) => void;
}

function prefetchAvatar(avatarUrl?: string | null) {
  if (
    avatarUrl &&
    typeof avatarUrl === "string" &&
    avatarUrl.startsWith("http")
  ) {
    void Image.prefetch(avatarUrl).catch(() => {});
  }
}

function parseOAuthCredentials(url: string): {
  accessToken?: string;
  code?: string;
  token?: string;
} {
  const hashMatch = url.match(/[#?&]access_token=([^&]+)/);
  const codeMatch = url.match(/[?&]code=([^&]+)/);
  const tokenMatch = url.match(/[?&]token=([^&]+)/);
  return {
    accessToken: hashMatch ? decodeURIComponent(hashMatch[1]) : undefined,
    code: codeMatch ? decodeURIComponent(codeMatch[1]) : undefined,
    token: tokenMatch ? decodeURIComponent(tokenMatch[1]) : undefined,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  isHydrated: false,
  isAuthenticated: false,

  setUsuario: (usuario) => {
    prefetchAvatar(usuario?.avatar_url);
    void setCachedUser(usuario);
    set({ usuario, isAuthenticated: Boolean(usuario) });
  },

  hydrate: async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ usuario: null, isAuthenticated: false, isHydrated: true });
        return;
      }

      // Hidratación instantánea desde caché local para cargar el avatar de inmediato
      const cached = await getCachedUser<Perfil>();
      if (cached) {
        prefetchAvatar(cached.avatar_url);
        set({ usuario: cached, isAuthenticated: true, isHydrated: true });
      }

      // Sincronización en segundo plano con el servidor
      const usuario = await PerfilService.getMe();
      if (!usuario) {
        if (!cached) {
          await clearAccessToken();
          set({ usuario: null, isAuthenticated: false, isHydrated: true });
        }
        return;
      }
      prefetchAvatar(usuario.avatar_url);
      void setCachedUser(usuario);
      set({ usuario, isAuthenticated: true, isHydrated: true });
    } catch {
      const cached = await getCachedUser<Perfil>();
      if (!cached) {
        await clearAccessToken();
        set({ usuario: null, isAuthenticated: false, isHydrated: true });
      }
    }
  },

  login: async (email, password) => {
    const result = await PerfilService.loginConEmail(email, password);
    await setAccessToken(result.token);
    prefetchAvatar(result.usuario.avatar_url);
    void setCachedUser(result.usuario);
    set({ usuario: result.usuario, isAuthenticated: true });
  },

  loginWithGoogle: async () => {
    const redirectUri = Linking.createURL("callback");
    const authUrl = await PerfilService.obtenerUrlGoogle(redirectUri);
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type !== "success" || !result.url) {
      if (result.type === "cancel" || result.type === "dismiss") {
        return;
      }
      throw new Error("No se completó el inicio de sesión con Google.");
    }

    const { accessToken, code, token } = parseOAuthCredentials(result.url);

    // Si el puente web ya nos devolvió el JWT validado de Padel Nexus:
    if (token) {
      await setAccessToken(token);
      const usuario = await PerfilService.getMe();
      if (usuario) {
        prefetchAvatar(usuario.avatar_url);
        void setCachedUser(usuario);
        set({ usuario, isAuthenticated: true });
        return;
      }
    }

    if (!accessToken && !code) {
      throw new Error("No se recibieron credenciales de Google.");
    }

    const res = await PerfilService.verificarTokenGoogle({
      accessToken,
      code,
    });
    await setAccessToken(res.token);
    prefetchAvatar(res.usuario.avatar_url);
    void setCachedUser(res.usuario);
    set({ usuario: res.usuario, isAuthenticated: true });
  },

  register: async (payload) => {
    const registro = await PerfilService.registrarUsuario(payload);
    try {
      const session = await PerfilService.loginConEmail(
        payload.email,
        payload.password,
      );
      await setAccessToken(session.token);
      prefetchAvatar(session.usuario.avatar_url);
      void setCachedUser(session.usuario);
      set({ usuario: session.usuario, isAuthenticated: true });
    } catch {
      throw new Error(
        registro.mensaje ||
          "Cuenta creada. Revisá tu email para confirmar y luego iniciá sesión.",
      );
    }
  },

  logout: async () => {
    await clearAccessToken();
    set({ usuario: null, isAuthenticated: false });
  },
}));
