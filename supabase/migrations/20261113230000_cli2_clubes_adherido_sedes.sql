-- CLI-2: distinguir club adherido (reservas publicas) de sede registrada (solo torneos / reutilizable).

ALTER TABLE public.clubes
  ADD COLUMN IF NOT EXISTS es_adherido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creado_por_club_id uuid REFERENCES public.clubes (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creado_por_entidad_id uuid;

COMMENT ON COLUMN public.clubes.es_adherido IS
  'true: visible en /reservar y red de reservas; false: sede registrada sin listado publico.';
COMMENT ON COLUMN public.clubes.creado_por_club_id IS
  'Club organizador que dio de alta la sede (admin_club); null si lo creo federacion/provincia.';
COMMENT ON COLUMN public.clubes.creado_por_entidad_id IS
  'Asociacion o federacion que registro la sede cuando no aplica creado_por_club_id.';

CREATE INDEX IF NOT EXISTS idx_clubes_es_adherido ON public.clubes (es_adherido)
  WHERE es_adherido = true;

CREATE INDEX IF NOT EXISTS idx_clubes_creado_por_club ON public.clubes (creado_por_club_id)
  WHERE creado_por_club_id IS NOT NULL;

-- Backfill: clubes ya operativos en red o con actividad de reservas / suscripcion.
UPDATE public.clubes c
SET
  es_adherido = true,
  creado_por_entidad_id = COALESCE(c.creado_por_entidad_id, c.asociacion_id)
WHERE
  c.creado_por_club_id IS NULL
  AND (
    c.suscripcion_sin_comisiones = true
    OR EXISTS (
      SELECT 1
      FROM public.reservas r
      INNER JOIN public.turnos t ON t.id = r.turno_id
      INNER JOIN public.canchas ca ON ca.id = t.cancha_id
      WHERE ca.club_id = c.id
    )
    OR c.estado = 'Activo'
  );
