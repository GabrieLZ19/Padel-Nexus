import { api } from "../api";

export interface CifrasSitioPublico {
  jugadores: number;
  torneos: number;
  clubes: number;
  canchas: number;
}

export const SitioPublicoService = {
  async cifras(): Promise<CifrasSitioPublico> {
    const response = await api.get<CifrasSitioPublico>("/publico/cifras");
    return response.data;
  },
};
