import { create } from "zustand";
import { PerfilService } from "@/utils/services/perfil";
import { Perfil } from "@/utils/types";

interface ProfileStore {
  profile: Perfil | null;
  fetchProfile: () => Promise<void>;
  setProfile: (profile: Perfil | null) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
  fetchProfile: async () => {
    try {
      const data = await PerfilService.getMe();
      console.log("🟢 API /perfil/me respondió con éxito:", data);
      set({ profile: data });
    } catch (e) {
      console.error("🔴 Error cargando sesión en Zustand:", e);
      set({ profile: null });
    }
  },
}));
