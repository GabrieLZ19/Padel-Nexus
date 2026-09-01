import { create } from "zustand";

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/src/lib/secureToken";
import { PerfilService } from "@/src/services/perfil";
import type { Perfil, RegistroPayload } from "@/src/types/user.types";

interface AuthState {
  usuario: Perfil | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegistroPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUsuario: (usuario: Perfil | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  isHydrated: false,
  isAuthenticated: false,

  setUsuario: (usuario) =>
    set({ usuario, isAuthenticated: Boolean(usuario) }),

  hydrate: async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ usuario: null, isAuthenticated: false, isHydrated: true });
        return;
      }
      const usuario = await PerfilService.getMe();
      if (!usuario) {
        await clearAccessToken();
        set({ usuario: null, isAuthenticated: false, isHydrated: true });
        return;
      }
      set({ usuario, isAuthenticated: true, isHydrated: true });
    } catch {
      await clearAccessToken();
      set({ usuario: null, isAuthenticated: false, isHydrated: true });
    }
  },

  login: async (email, password) => {
    const result = await PerfilService.loginConEmail(email, password);
    await setAccessToken(result.token);
    set({ usuario: result.usuario, isAuthenticated: true });
  },

  register: async (payload) => {
    const registro = await PerfilService.registrarUsuario(payload);
    try {
      const session = await PerfilService.loginConEmail(
        payload.email,
        payload.password,
      );
      await setAccessToken(session.token);
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
