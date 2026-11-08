-- RES-1: retención de turno mientras el pago (Mercado Pago / checkout) está pendiente
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS retiene_hasta timestamptz;

COMMENT ON COLUMN public.reservas.retiene_hasta IS
  'Hasta cuándo el turno queda retenido con reserva o pago pendiente.';

-- Pendientes de transferencia en revisión: retener 14 días
UPDATE public.reservas r
SET retiene_hasta = NOW() + interval '14 days'
WHERE r.estado_reserva = 'pendiente'
  AND r.retiene_hasta IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.pagos p
    WHERE p.reserva_id = r.id
      AND p.metodo_pago = 'transferencia'
      AND p.estado = 'pendiente'
  );

-- Otros pendientes de pago: TTL de 20 minutos desde la creación (o expirar ya)
UPDATE public.reservas r
SET retiene_hasta = r.created_at + interval '20 minutes'
WHERE r.estado_reserva = 'pendiente'
  AND r.estado_pago = 'pendiente'
  AND r.retiene_hasta IS NULL;
