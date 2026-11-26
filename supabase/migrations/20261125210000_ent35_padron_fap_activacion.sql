-- ENT-35: OTP para activación padrón FAP sin contacto previo y método padron_fap en tokens.

CREATE TABLE IF NOT EXISTS public.preinscripcion_padron_fap_otp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dni text NOT NULL,
  perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
  canal text NOT NULL CHECK (canal IN ('email', 'telefono')),
  destino text NOT NULL,
  codigo_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preinscripcion_padron_otp_dni_vigente
  ON public.preinscripcion_padron_fap_otp (dni)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_preinscripcion_padron_otp_expires
  ON public.preinscripcion_padron_fap_otp (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.preinscripcion_padron_fap_otp ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.preinscripcion_tokens_activacion
  DROP CONSTRAINT IF EXISTS preinscripcion_tokens_activacion_metodo_check;

ALTER TABLE public.preinscripcion_tokens_activacion
  ADD CONSTRAINT preinscripcion_tokens_activacion_metodo_check
  CHECK (metodo IN ('telefono', 'email', 'padron_fap'));