import { create } from "zustand";
import { PerfilService } from "@/utils/services/perfil";
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
    try {
      const perfil = await PerfilService.getMe();

      if (perfil && perfil.id) {
        set({ profile: perfil });
        return true;
      }
      throw new Error("El backend no devolvió un perfil válido");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      console.error("🔴 ERROR EN FETCH_PROFILE:", message);
      set({ profile: null });
      return false; // Avisamos que falló
    }
  },
}));
