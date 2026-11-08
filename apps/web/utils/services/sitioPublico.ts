import { api } from "../api";

export interface CifrasSitioPublico {
  jugadores: number;
  torneos: number;
  clubes: number;
  canchas: number;
}

export type EstadoLicenciaPublica =
  | "activa"
  | "vencida"
  | "suspendida"
  | "no_valida";

export interface VerificacionLicenciaPublica {
  valida: boolean;
  estado: EstadoLicenciaPublica;
  nombre: string | null;
  apellido: string | null;
  titular: string | null;
  dni_parcial: string | null;
  nro_licencia: string | null;
  fecha_vencimiento: string | null;
  fecha_vencimiento_texto: string | null;
  mensaje: string | null;
}

export const SitioPublicoService = {
  async cifras(): Promise<CifrasSitioPublico> {
    const response = await api.get<CifrasSitioPublico>("/publico/cifras");
    return response.data;
  },

  async verificarLicencia(
    usuarioId: string,
    licenciaId?: string | null,
  ): Promise<VerificacionLicenciaPublica> {
    const response = await api.get<{
      exito: boolean;
      data: VerificacionLicenciaPublica;
    }>(`/publico/licencias/verificar/${usuarioId}`, {
      params: licenciaId ? { licencia: licenciaId } : undefined,
    });
    return response.data.data;
  },
};
