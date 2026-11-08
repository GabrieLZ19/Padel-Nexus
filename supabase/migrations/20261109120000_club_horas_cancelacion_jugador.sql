-- RES-3: antelación mínima para que el jugador cancele una reserva confirmada
ALTER TABLE public.clubes
  ADD COLUMN IF NOT EXISTS horas_antelacion_cancelacion_jugador integer NOT NULL DEFAULT 24;

ALTER TABLE public.clubes
  DROP CONSTRAINT IF EXISTS clubes_horas_antelacion_cancelacion_jugador_check;

ALTER TABLE public.clubes
  ADD CONSTRAINT clubes_horas_antelacion_cancelacion_jugador_check
  CHECK (horas_antelacion_cancelacion_jugador >= 0 AND horas_antelacion_cancelacion_jugador <= 168);

COMMENT ON COLUMN public.clubes.horas_antelacion_cancelacion_jugador IS
  'Horas antes del inicio del turno en que el jugador puede cancelar una reserva confirmada. 0 permite hasta el inicio.';
