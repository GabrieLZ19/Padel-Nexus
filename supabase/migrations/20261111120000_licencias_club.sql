-- ENT-11: licencias federativas de clubes (feature 10.0 clubes)
CREATE TABLE IF NOT EXISTS public.licencias_club (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubes (id) ON DELETE CASCADE,
  asociacion_id uuid REFERENCES public.asociaciones (id) ON DELETE SET NULL,
  nro_licencia text NOT NULL,
  estado public.estado_licencia_enum NOT NULL DEFAULT 'Pendiente',
  fecha_emision date,
  fecha_vencimiento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT licencias_club_club_id_key UNIQUE (club_id),
  CONSTRAINT licencias_club_nro_licencia_key UNIQUE (nro_licencia)
);

CREATE INDEX IF NOT EXISTS idx_licencias_club_asociacion
  ON public.licencias_club (asociacion_id);

CREATE TABLE IF NOT EXISTS public.licencias_club_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licencia_club_id uuid NOT NULL REFERENCES public.licencias_club (id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubes (id) ON DELETE CASCADE,
  periodo text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pagado',
  metodo text NOT NULL DEFAULT 'manual',
  mp_payment_id text,
  registrado_por uuid REFERENCES public.perfiles (id) ON DELETE SET NULL,
  notas text,
  pagado_en timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT licencias_club_pagos_periodo_unique UNIQUE (licencia_club_id, periodo)
);

ALTER TABLE public.licencias_club ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licencias_club_pagos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.licencias_club IS
  'Licencia federativa del club: número, vigencia y estado (alta distinta del estado operativo del club).';

-- Backfill: un carnet por club existente, alineado al estado operativo actual
INSERT INTO public.licencias_club (
  club_id,
  asociacion_id,
  nro_licencia,
  estado,
  fecha_emision,
  fecha_vencimiento
)
SELECT
  c.id,
  c.asociacion_id,
  'CLB-' || upper(substr(replace(c.id::text, '-', ''), 1, 8)),
  CASE
    WHEN c.estado = 'Pendiente' THEN 'Pendiente'::public.estado_licencia_enum
    WHEN c.estado = 'Inactivo' THEN 'Suspendida'::public.estado_licencia_enum
    ELSE 'Activa'::public.estado_licencia_enum
  END,
  coalesce(c.created_at::date, current_date),
  (coalesce(c.created_at::date, current_date) + interval '1 year')::date
FROM public.clubes c
WHERE NOT EXISTS (
  SELECT 1 FROM public.licencias_club lc WHERE lc.club_id = c.id
);
