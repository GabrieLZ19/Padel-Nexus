-- RES-2: cancelación por club con motivo y cierre de pago pendiente
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS motivo_cancelacion text,
  ADD COLUMN IF NOT EXISTS cancelada_en timestamptz;

COMMENT ON COLUMN public.reservas.motivo_cancelacion IS 'Motivo ingresado por el club al cancelar la reserva.';
COMMENT ON COLUMN public.reservas.cancelada_en IS 'Marca de tiempo de cancelación (club o jugador).';
