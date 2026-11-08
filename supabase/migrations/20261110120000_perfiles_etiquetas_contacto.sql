-- ENT-10: etiquetas de contacto CRM (marketing / institucional) por jugador
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS etiquetas_contacto text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.perfiles.etiquetas_contacto IS
  'Segmentos CRM del contacto (marketing, institucional). Solo administración.';
