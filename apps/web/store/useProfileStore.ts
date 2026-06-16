import { create } from "zustand";
import { PerfilService } from "@/utils/services/perfil";
import { Perfil } from "@/utils/types";

interface ProfileStore {
  profile: Perfil | null;
  fetchProfile: () => Promise<void>;
  setProfile: (profile: Perfil) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  fetchProfile: async () => {
    try {
      const data = await PerfilService.getMe();
      set({ profile: data });
    } catch (e) {
      console.error(e);
    }
  },
}));
