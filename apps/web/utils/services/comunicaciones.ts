import { api } from "../api";
import type {
  AudienciaPreview,
  ComunicacionesCampana,
  ComunicacionesLista,
  ComunicacionesContactoBusqueda,
  CrearListaPayload,
  EnviarCampanaPayload,
  ComunicacionesFiltros,
  ComunicacionesAudienciaTipo,
} from "../types/comunicaciones.types";

export type ComunicacionesConfig = {
  campana_email_habilitado: boolean;
  resend_configurado: boolean;
};

export class ComunicacionesService {
  static async obtenerConfig(): Promise<ComunicacionesConfig> {
    const { data } = await api.get<{
      exito: boolean;
      data: ComunicacionesConfig;
    }>("/comunicaciones/config");
    return (
      data.data || {
        campana_email_habilitado: false,
        resend_configurado: false,
      }
    );
  }

  static async buscarContactos(
    q: string,
    opts?: { solo_jugadores?: boolean },
  ): Promise<ComunicacionesContactoBusqueda[]> {
    const { data } = await api.get<{
      exito: boolean;
      data: ComunicacionesContactoBusqueda[];
    }>("/comunicaciones/contactos", {
      params: {
        q,
        solo_jugadores:
          opts?.solo_jugadores === false ? "false" : undefined,
      },
    });
    return data.data || [];
  }

  static async listarListas(): Promise<ComunicacionesLista[]> {
    const { data } = await api.get<{ exito: boolean; data: ComunicacionesLista[] }>(
      "/comunicaciones/listas",
    );
    return data.data || [];
  }

  static async obtenerLista(id: string): Promise<ComunicacionesLista> {
    const { data } = await api.get<{ exito: boolean; data: ComunicacionesLista }>(
      `/comunicaciones/listas/${id}`,
    );
    return data.data;
  }

  static async crearLista(payload: CrearListaPayload): Promise<ComunicacionesLista> {
    const { data } = await api.post<{ exito: boolean; data: ComunicacionesLista }>(
      "/comunicaciones/listas",
      payload,
    );
    return data.data;
  }

  static async agregarMiembrosLista(
    listaId: string,
    perfilIds: string[],
  ): Promise<ComunicacionesLista> {
    const { data } = await api.post<{ exito: boolean; data: ComunicacionesLista }>(
      `/comunicaciones/listas/${listaId}/miembros`,
      { perfil_ids: perfilIds },
    );
    return data.data;
  }

  static async actualizarLista(
    id: string,
    payload: Partial<CrearListaPayload>,
  ): Promise<ComunicacionesLista> {
    const { data } = await api.patch<{ exito: boolean; data: ComunicacionesLista }>(
      `/comunicaciones/listas/${id}`,
      payload,
    );
    return data.data;
  }

  static async eliminarLista(id: string): Promise<void> {
    await api.delete(`/comunicaciones/listas/${id}`);
  }

  static async previewAudiencia(payload: {
    audiencia_tipo: ComunicacionesAudienciaTipo;
    filtros?: ComunicacionesFiltros;
    lista_id?: string | null;
  }): Promise<AudienciaPreview> {
    const { data } = await api.post<{ exito: boolean; data: AudienciaPreview }>(
      "/comunicaciones/audiencia/preview",
      payload,
    );
    return data.data;
  }

  static async enviarCampana(payload: EnviarCampanaPayload): Promise<{
    campana: ComunicacionesCampana;
    total_destinatarios: number;
    total_enviados: number;
    metricas?: ComunicacionesCampana["metricas"];
  }> {
    const { data } = await api.post<{
      exito: boolean;
      data: {
        campana: ComunicacionesCampana;
        total_destinatarios: number;
        total_enviados: number;
        metricas?: ComunicacionesCampana["metricas"];
      };
    }>("/comunicaciones/campanas", payload);
    return data.data;
  }

  static async registrarClicCampana(campanaId: string): Promise<void> {
    await api.post(`/comunicaciones/campanas/${campanaId}/clic`);
  }

  static async listarCampanas(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    data: ComunicacionesCampana[];
    total: number;
  }> {
    const { data } = await api.get<{
      exito: boolean;
      data: ComunicacionesCampana[];
      total: number;
    }>("/comunicaciones/campanas", {
      params: opts,
    });
    return { data: data.data || [], total: data.total || 0 };
  }
}
