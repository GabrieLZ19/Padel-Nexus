-- PUB-19: tokens de verificación para activar fichas provisorias y bloqueo por intentos fallidos.
-- Solo el backend (service_role) accede a estas tablas.

CREATE TABLE IF NOT EXISTS public.preinscripcion_tokens_activacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dni text NOT NULL,
  perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  metodo text NOT NULL CHECK (metodo IN ('telefono', 'email')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preinscripcion_tokens_dni_vigente
  ON public.preinscripcion_tokens_activacion (dni)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_preinscripcion_tokens_expires
  ON public.preinscripcion_tokens_activacion (expires_at)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS public.preinscripcion_verificacion_bloqueos (
  dni text PRIMARY KEY,
  intentos_fallidos integer NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
  bloqueado_hasta timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.preinscripcion_tokens_activacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preinscripcion_verificacion_bloqueos ENABLE ROW LEVEL SECURITY;

-- Corrección de datos QA (PUB-19 categoria corrupta en prueba de activación)
UPDATE public.perfiles
SET categoria_padel = '7ª'
WHERE dni = '99000302' AND categoria_padel IS DISTINCT FROM '7ª';
