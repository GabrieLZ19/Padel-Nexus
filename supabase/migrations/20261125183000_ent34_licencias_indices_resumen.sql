-- ENT-34: índices de búsqueda y agregación de resumen sin paginar en memoria

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS idx_perfiles_dni ON public.perfiles (dni);
CREATE INDEX IF NOT EXISTS idx_perfiles_apellido ON public.perfiles (apellido);
CREATE INDEX IF NOT EXISTS idx_perfiles_nombre ON public.perfiles (nombre);
CREATE INDEX IF NOT EXISTS idx_perfiles_lugar_residencia ON public.perfiles (lugar_residencia);
CREATE INDEX IF NOT EXISTS idx_perfiles_created_at ON public.perfiles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_perfiles_nombre_trgm
  ON public.perfiles USING gin (lower(nombre) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_perfiles_apellido_trgm
  ON public.perfiles USING gin (lower(apellido) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_perfiles_dni_trgm
  ON public.perfiles USING gin (lower(dni) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_licencias_usuario_id ON public.licencias (usuario_id);
CREATE INDEX IF NOT EXISTS idx_licencias_asociacion_id ON public.licencias (asociacion_id);
CREATE INDEX IF NOT EXISTS idx_licencias_estado ON public.licencias (estado);
CREATE INDEX IF NOT EXISTS idx_licencias_nro_trgm
  ON public.licencias USING gin (lower(nro_licencia) extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.licencia_estado_efectivo(
  p_estado text,
  p_fecha_vencimiento date,
  p_hoy date
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(btrim(coalesce(p_estado, ''))) IN ('suspendida') THEN 'Suspendida'
    WHEN lower(btrim(coalesce(p_estado, ''))) IN ('pendiente', 'rechazada') THEN 'Pendiente'
    WHEN p_fecha_vencimiento IS NOT NULL AND p_fecha_vencimiento < p_hoy THEN 'Vencida'
    WHEN lower(btrim(coalesce(p_estado, ''))) IN ('vencida') THEN 'Vencida'
    ELSE 'Activa'
  END;
$$;

CREATE OR REPLACE FUNCTION public.perfil_texto_norm(texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT lower(extensions.unaccent(btrim(coalesce(texto, ''))));
$$;

CREATE OR REPLACE FUNCTION public.perfil_en_alcance_licencia(
  p_perfil_id uuid,
  p_provincia text,
  p_asociacion_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_provincia IS NULL AND p_asociacion_id IS NULL THEN true
    ELSE (
      p_asociacion_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.licencias l
        WHERE l.usuario_id = p_perfil_id
          AND l.asociacion_id = p_asociacion_id
      )
    )
    OR (
      p_provincia IS NOT NULL
      AND public.perfil_texto_norm(
        (SELECT p.lugar_residencia FROM public.perfiles p WHERE p.id = p_perfil_id)
      ) = public.perfil_texto_norm(p_provincia)
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.perfil_coincide_busqueda_licencias(
  p_perfil_id uuid,
  p_search text,
  p_usuario_ids uuid[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_search IS NULL OR btrim(p_search) = '' THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.perfiles p
      WHERE p.id = p_perfil_id
        AND (
          p.nombre ILIKE ('%' || p_search || '%')
          OR p.apellido ILIKE ('%' || p_search || '%')
          OR p.email ILIKE ('%' || p_search || '%')
          OR p.dni ILIKE ('%' || p_search || '%')
          OR (
            p_usuario_ids IS NOT NULL
            AND cardinality(p_usuario_ids) > 0
            AND p.id = ANY (p_usuario_ids)
          )
        )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.licencias_estado_visible_jugador(
  p_usuario_id uuid,
  p_hoy date
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH eff AS (
    SELECT public.licencia_estado_efectivo(
      l.estado::text,
      l.fecha_vencimiento::date,
      p_hoy
    ) AS estado
    FROM public.licencias l
    WHERE l.usuario_id = p_usuario_id
  )
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM eff WHERE estado = 'Pendiente') THEN 'Pendiente'
    WHEN EXISTS (SELECT 1 FROM eff WHERE estado = 'Activa') THEN 'Activa'
    WHEN EXISTS (SELECT 1 FROM eff WHERE estado = 'Vencida') THEN 'Vencida'
    WHEN EXISTS (SELECT 1 FROM eff WHERE estado = 'Suspendida') THEN 'Suspendida'
    ELSE 'otro'
  END;
$$;

CREATE OR REPLACE FUNCTION public.licencias_resumen_jugadores(
  p_hoy date,
  p_search text DEFAULT NULL,
  p_provincia text DEFAULT NULL,
  p_asociacion_id uuid DEFAULT NULL,
  p_usuario_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH jugadores AS (
    SELECT DISTINCT l.usuario_id AS id
    FROM public.licencias l
    INNER JOIN public.perfiles p ON p.id = l.usuario_id
    WHERE public.perfil_coincide_busqueda_licencias(
      p.id,
      p_search,
      p_usuario_ids
    )
    AND public.perfil_en_alcance_licencia(p.id, p_provincia, p_asociacion_id)
  ),
  visibles AS (
    SELECT
      j.id,
      public.licencias_estado_visible_jugador(j.id, p_hoy) AS estado
    FROM jugadores j
  )
  SELECT jsonb_build_object(
    'total', count(*)::int,
    'pendientes', count(*) FILTER (WHERE estado = 'Pendiente')::int,
    'vigentes', count(*) FILTER (WHERE estado = 'Activa')::int,
    'vencidas', count(*) FILTER (WHERE estado = 'Vencida')::int,
    'suspendidas', count(*) FILTER (WHERE estado = 'Suspendida')::int,
    'otros', count(*) FILTER (WHERE estado = 'otro')::int
  )
  FROM visibles;
$$;

CREATE OR REPLACE FUNCTION public.licencias_perfiles_ids_paginados(
  p_offset int,
  p_limit int,
  p_hoy date,
  p_search text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_provincia text DEFAULT NULL,
  p_asociacion_id uuid DEFAULT NULL,
  p_usuario_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT DISTINCT p.id, p.created_at
    FROM public.perfiles p
    INNER JOIN public.licencias l ON l.usuario_id = p.id
    WHERE public.perfil_coincide_busqueda_licencias(p.id, p_search, p_usuario_ids)
      AND public.perfil_en_alcance_licencia(p.id, p_provincia, p_asociacion_id)
  ),
  filtrado AS (
    SELECT b.id, b.created_at
    FROM base b
    WHERE
      p_estado IS NULL
      OR btrim(p_estado) = ''
      OR EXISTS (
        SELECT 1
        FROM public.licencias l
        WHERE l.usuario_id = b.id
          AND public.licencia_estado_efectivo(
            l.estado::text,
            l.fecha_vencimiento::date,
            p_hoy
          ) = p_estado
      )
  ),
  total_row AS (
    SELECT count(*)::bigint AS total FROM filtrado
  ),
  pagina AS (
    SELECT id
    FROM filtrado
    ORDER BY created_at DESC
    OFFSET greatest(p_offset, 0)
    LIMIT greatest(p_limit, 1)
  )
  SELECT jsonb_build_object(
    'total', (SELECT total FROM total_row),
    'ids', coalesce((SELECT jsonb_agg(id) FROM pagina), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.licencia_estado_efectivo(text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.perfil_texto_norm(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.perfil_en_alcance_licencia(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.perfil_coincide_busqueda_licencias(uuid, text, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.licencias_estado_visible_jugador(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.licencias_resumen_jugadores(date, text, text, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.licencias_perfiles_ids_paginados(int, int, date, text, text, text, uuid, uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.licencia_estado_efectivo(text, date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.perfil_texto_norm(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.perfil_en_alcance_licencia(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.perfil_coincide_busqueda_licencias(uuid, text, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.licencias_estado_visible_jugador(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.licencias_resumen_jugadores(date, text, text, uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.licencias_perfiles_ids_paginados(int, int, date, text, text, text, uuid, uuid[]) TO service_role;