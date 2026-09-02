export interface ClubReservaEmbed {
  id: string;
  nombre: string;
  provincia?: string;
  localidad?: string;
  cbu?: string | null;
  alias?: string | null;
}

export interface CanchaReservaEmbed {
  id: string;
  nombre: string;
  tipo_suelo?: string | null;
  techada?: boolean;
  clubes?: ClubReservaEmbed | null;
}

export interface TurnoReservaEmbed {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  dia_semana?: number;
  canchas?: CanchaReservaEmbed | null;
}

export interface PagoReserva {
  id: string;
  monto: number;
  metodo_pago: string;
  referencia_pago?: string | null;
  estado: string;
  comprobante_url?: string | null;
  created_at?: string;
}

export interface ReservaUsuario {
  id: string;
  turno_id?: string;
  usuario_id?: string;
  fecha_reserva: string;
  estado_pago: string;
  estado_reserva: string;
  turnos?: TurnoReservaEmbed | null;
  pagos?: PagoReserva[];
}

export interface SlotDisponible {
  turno_id: string;
  cancha_id: string;
  cancha_nombre: string;
  tipo_suelo: string | null;
  techada: boolean;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  disponible: boolean;
}
