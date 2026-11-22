-- Tienda destacada en marketplace (gestión Superadmin)
ALTER TABLE public.marketplace_vendedores
  ADD COLUMN IF NOT EXISTS tienda_destacada boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.marketplace_vendedores.tienda_destacada IS
  'Si true, la tienda aparece primero en la grilla pública del marketplace.';

CREATE INDEX IF NOT EXISTS idx_marketplace_vendedores_destacada_activo
  ON public.marketplace_vendedores (tienda_destacada DESC, nombre_tienda)
  WHERE estado = 'activo' AND entidad_id IS NOT NULL;