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

      // Si es null, el backend retornó un 401 (No autorizado). Limpiamos cookies de sesión.
      if (typeof window !== "undefined") {
        document.cookie = "padel_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "padel_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
