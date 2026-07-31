import { api } from "../api";
import { RankingJugador } from "../types";

export type JugadorRanking = RankingJugador & {
  nombre?: string;
  apellido?: string;
  categoria_padel?: string;
  provincia?: string;
  sexo?: string;
};

export const RankingsService = {
  getAll: async (): Promise<JugadorRanking[]> => {
    try {
      const res = await api.get("/rankings");
      const items = res.data?.data || res.data || [];

      // Mapeo seguro para extraer perfiles o propiedades directas
      return items.map((j: any, index: number) => {
        const perfil = j.perfiles || {};
        const nombre = j.nombre || perfil.nombre || "Jugador";
        const apellido = j.apellido || perfil.apellido || "";
        
        // Sanitizar categoría de prueba si viene "prueba" de torneos test
        let rawCat = j.categoria_padel || j.categoria || perfil.categoria_padel;
        if (!rawCat || rawCat.toLowerCase() === "prueba") {
          rawCat = perfil.categoria_padel || "5ª";
        }
        const categoria_padel = rawCat;

        const provincia = j.provincia || perfil.lugar_residencia || perfil.clubes?.provincia || "Argentina";
        const sexo = j.sexo || j.rama || perfil.sexo || "Masculino";

        const dni = j.dni || perfil.dni || "N/D";
        const avatar_url = j.avatar_url || perfil.avatar_url || null;
        const club = j.club || perfil.clubes?.nombre || "Club Afiliado";

        return {
          ...j,
          id: j.id || `rank-${index}`,
          nombre,
          apellido,
          dni,
          avatar_url,
          club,
          categoria_padel,
          provincia,
          sexo,
          puntos: j.puntos ?? j.ranking_nacional ?? 0,
        };
      });
    } catch (error) {
      console.warn("Error al cargar rankings desde la API:", error);
      return [];
    }
  },
};
