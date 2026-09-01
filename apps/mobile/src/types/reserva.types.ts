export interface ReservaUsuario {
  id: string;
  fecha_reserva: string;
  estado_pago: string;
  estado_reserva: string;
  turnos?: {
    hora_inicio: string;
    hora_fin: string;
    precio: number;
    canchas?: {
      nombre: string;
      clubes?: {
        nombre: string;
        localidad?: string;
        provincia?: string;
      } | null;
    } | null;
  } | null;
}
