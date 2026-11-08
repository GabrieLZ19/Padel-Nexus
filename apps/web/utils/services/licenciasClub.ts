import { api } from "../api";

export interface LicenciaClub {
  id: string;
  club_id: string;
  asociacion_id?: string | null;
  nro_licencia: string;
  estado: string;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
}

export interface LicenciaClubPago {
  id: string;
  licencia_club_id: string;
  club_id: string;
  periodo: string;
  monto: number;
  estado: string;
  metodo: string;
  notas?: string | null;
  pagado_en?: string;
}

export interface LicenciaClubResumen {
  nro_licencia: string;
  estado: string;
  fecha_vencimiento?: string | null;
}

export const LicenciasClubService = {
  async obtener(clubId: string): Promise<LicenciaClub | null> {
    const res = await api.get(`/clubes/${clubId}/licencia`);
    return res.data?.data ?? null;
  },

  async actualizarEstado(
    clubId: string,
    licenciaId: string,
    estado: string,
    fecha_vencimiento?: string,
  ): Promise<LicenciaClub> {
    const res = await api.patch(`/clubes/${clubId}/licencia/${licenciaId}/estado`, {
      estado,
      fecha_vencimiento,
    });
    return res.data.data;
  },

  async registrarPago(
    clubId: string,
    licenciaId: string,
    payload?: { monto?: number; notas?: string },
  ): Promise<void> {
    await api.post(`/clubes/${clubId}/licencia/${licenciaId}/pagos`, payload || {});
  },

  async listarPagos(clubId: string, licenciaId: string): Promise<LicenciaClubPago[]> {
    const res = await api.get(`/clubes/${clubId}/licencia/${licenciaId}/pagos`);
    return res.data?.data ?? [];
  },

  async darDeBaja(clubId: string, licenciaId: string): Promise<void> {
    await api.delete(`/clubes/${clubId}/licencia/${licenciaId}`);
  },

  async obtenerMiClub(): Promise<LicenciaClub | null> {
    const res = await api.get("/club/mi-club/licencia");
    return res.data?.data ?? null;
  },
};
