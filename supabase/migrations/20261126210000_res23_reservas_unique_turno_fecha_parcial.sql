-- RES-23: permitir nueva reserva en turno/fecha cuando la reserva previa fue cancelada
ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS unique_turno_fecha;

CREATE UNIQUE INDEX unique_turno_fecha
  ON public.reservas (turno_id, fecha_reserva)
  WHERE (estado_reserva IS DISTINCT FROM 'cancelada');

COMMENT ON INDEX public.unique_turno_fecha IS
  'Un turno/fecha solo admite una reserva activa (no cancelada).';