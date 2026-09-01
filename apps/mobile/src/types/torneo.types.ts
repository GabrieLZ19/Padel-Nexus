export type EstadoTorneo =
  | "Borrador"
  | "Inscripción"
  | "Cerrado"
  | "En curso"
  | "Finalizado";

export interface TorneoClub {
  id?: string;
  nombre?: string;
  provincia?: string;
  localidad?: string;
}

export interface Torneo {
  id: string;
  nombre: string;
  subtitulo?: string | null;
  fecha?: string | null;
  estado: EstadoTorneo | string;
  cupos_maximos: number;
  cupos_actuales: number;
  nivel?: string | null;
  modalidad: string;
  precio_inscripcion: number;
  formato: string;
  lugar?: string | null;
  alcance?: string | null;
  banners?: string[];
  clubes?: TorneoClub | null;
}
