export type FranjaPartido = "manana" | "tarde" | "noche";

export type EstadoPartidoAbierto = "abierto" | "completo" | "cerrado" | "cancelado";

export interface PartidoAbiertoInscripto {
  id: string;
  jugador_id: string;
  estado: string;
  perfiles?: {
    nombre: string | null;
    apellido: string | null;
    avatar_url: string | null;
  } | null;
}

export interface PartidoAbierto {
  id: string;
  reserva_id: string;
  creador_id: string;
  nivel_requerido: string | null;
  jugadores_faltantes: number;
  notas: string | null;
  estado: EstadoPartidoAbierto | string;
  created_at: string;
  perfiles?: {
    nombre: string | null;
    apellido: string | null;
    avatar_url: string | null;
  } | null;
  reservas?: {
    id: string;
    fecha_reserva: string;
    turno_id: string;
    turnos?: {
      id: string;
      hora_inicio: string;
      hora_fin: string;
      canchas?: {
        id: string;
        nombre: string;
        clubes?: {
          id: string;
          nombre: string;
          localidad: string | null;
          provincia: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
  inscripciones_partidos?: PartidoAbiertoInscripto[];
}

export interface FiltrosPartidosAbiertos {
  nivel_requerido?: string;
  provincia?: string;
  localidad?: string;
  franja?: FranjaPartido;
}

export interface PublicarPartidoAbiertoPayload {
  reserva_id: string;
  nivel_requerido: string;
  jugadores_faltantes: number;
  notas?: string;
}

export const NIVELES_PARTIDO = [
  "5ta",
  "6ta",
  "7ma",
  "8va",
  "Principiante",
  "Intermedio",
  "Avanzado",
] as const;
