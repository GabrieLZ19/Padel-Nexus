import { api } from "@/utils/api";
import type { Partido, Torneo } from "@/utils/types";

export type AlcanceFiscal = "Nacional" | "Provincial" | "Regional" | "Local";
export type TipoIncidenciaFiscal =
  | "incidencia"
  | "sancion"
  | "descalificacion"
  | "cambio_categoria";

export interface FiscalTorneo extends Torneo {
  rol_torneo?: "general" | "auxiliar";
  sede_nombre?: string | null;
}

export function nombreSedeFiscal(torneo: Pick<FiscalTorneo, "sede_nombre" | "lugar" | "clubes">): string {
  return (
    torneo.sede_nombre ||
    torneo.clubes?.nombre ||
    torneo.lugar ||
    "Sede a confirmar"
  );
}

export interface LicenciaFiscal {
  id: string;
  nro_licencia: string;
  estado: string;
  fecha_vencimiento: string | null;
}

export interface JugadorFiscalResumen {
  id: string | null;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  categoria_padel: string | null;
  nombre_completo: string | null;
  licencia: LicenciaFiscal | null;
}

export interface ParejaFiscal {
  inscripcion_id: string;
  torneo_id: string;
  estado_pago: string;
  jugador1: JugadorFiscalResumen;
  jugador2: JugadorFiscalResumen | null;
}

export interface IncidenciaFiscal {
  id: string;
  torneo_id: string;
  partido_id: string | null;
  jugador_id: string | null;
  inscripcion_id: string | null;
  fiscal_id: string;
  tipo: TipoIncidenciaFiscal;
  gravedad: "leve" | "grave" | "muy_grave" | null;
  descripcion: string;
  motivo: string;
  categoria_anterior: string | null;
  categoria_nueva: string | null;
  estado: "registrada" | "aplicada" | "anulada";
  created_at: string;
  fiscales?: { id: string; nombre: string; apellido: string; rango: string } | null;
  perfiles?: { id: string; nombre: string; apellido: string; dni: string | null } | null;
}

export interface FichaJugadorFiscal {
  id: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  categoria_padel: string | null;
  email: string | null;
  telefono: string | null;
  lugar_residencia: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  licencias?: LicenciaFiscal[];
  incidencias?: IncidenciaFiscal[];
}

export interface ReporteFiscal {
  generado_en: string;
  fiscal: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    rango: string;
  } | null;
  torneo: FiscalTorneo;
  partidos: Partido[];
  jugadores: ParejaFiscal[];
  incidencias: IncidenciaFiscal[];
}

export interface CrearIncidenciaPayload {
  tipo: TipoIncidenciaFiscal;
  descripcion: string;
  motivo: string;
  gravedad?: "leve" | "grave" | "muy_grave" | null;
  partido_id?: string | null;
  jugador_id?: string | null;
  inscripcion_id?: string | null;
  categoria_nueva?: string | null;
}

export const FiscalPanelService = {
  async getTorneos(alcance?: string): Promise<FiscalTorneo[]> {
    const res = await api.get<FiscalTorneo[]>("/fiscal-panel/torneos", {
      params: alcance && alcance !== "Todos" ? { alcance } : undefined,
    });
    return res.data || [];
  },

  async getTorneo(torneoId: string): Promise<FiscalTorneo> {
    const res = await api.get<FiscalTorneo>(`/fiscal-panel/torneos/${torneoId}`);
    return res.data;
  },

  async getPartidos(torneoId: string): Promise<Partido[]> {
    const res = await api.get<Partido[]>(`/fiscal-panel/torneos/${torneoId}/partidos`);
    return res.data || [];
  },

  async getJugadores(torneoId: string): Promise<ParejaFiscal[]> {
    const res = await api.get<ParejaFiscal[]>(`/fiscal-panel/torneos/${torneoId}/jugadores`);
    return res.data || [];
  },

  async getIncidencias(torneoId: string): Promise<IncidenciaFiscal[]> {
    const res = await api.get<IncidenciaFiscal[]>(`/fiscal-panel/torneos/${torneoId}/incidencias`);
    return res.data || [];
  },

  async registrarIncidencia(
    torneoId: string,
    payload: CrearIncidenciaPayload,
  ): Promise<IncidenciaFiscal> {
    const res = await api.post<IncidenciaFiscal>(
      `/fiscal-panel/torneos/${torneoId}/incidencias`,
      payload,
    );
    return res.data;
  },

  async getJugador(jugadorId: string): Promise<FichaJugadorFiscal> {
    const res = await api.get<FichaJugadorFiscal>(`/fiscal-panel/jugadores/${jugadorId}`);
    return res.data;
  },

  async getReporte(torneoId: string): Promise<ReporteFiscal> {
    const res = await api.get<ReporteFiscal>(`/fiscal-panel/torneos/${torneoId}/reporte`);
    return res.data;
  },
};
