ALTER TABLE public.marketplace_ordenes
  ADD COLUMN IF NOT EXISTS retiene_hasta timestamptz;

COMMENT ON COLUMN public.marketplace_ordenes.retiene_hasta IS
  'MKT-1: límite para completar el pago MP; al vencer, la orden pasa a cancelada y se libera stock.';

UPDATE public.marketplace_ordenes o
SET retiene_hasta = o.created_at + interval '15 minutes'
WHERE o.estado = 'pendiente'
  AND o.retiene_hasta IS NULL;