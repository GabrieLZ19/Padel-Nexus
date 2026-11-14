import { create } from "zustand";
import { cerrarSesionCliente } from "@/utils/auth/sesionBff";
import { PerfilService } from "@/utils/services/perfil";
import { tieneSesionCliente } from "@/utils/session";
import { Perfil } from "@/utils/types";

interface ProfileStore {
  profile: Perfil | null;
  fetchProfile: () => Promise<boolean>; // ⬅️ Cambiado para que devuelva éxito o fracaso
  setProfile: (profile: Perfil | null) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),

  fetchProfile: async () => {
    if (!tieneSesionCliente()) {
      set({ profile: null });
      return false;
    }

    try {
      const perfil = await PerfilService.getMe();

      if (perfil && perfil.id) {
        set({ profile: perfil });
        return true;
      }

      if (typeof window !== "undefined") {
        await cerrarSesionCliente();
      }
      set({ profile: null });
      return false;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error de red";
      console.error("🔴 ERROR EN FETCH_PROFILE:", message);
      // En error de red no borramos las cookies para no desloguear accidentalmente
      return false;
    }
  },
}));
