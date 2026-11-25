-- ENT-37: búsqueda AND por tokens (nombre, apellido, DNI, nro licencia) con unaccent

CREATE OR REPLACE FUNCTION public.perfil_token_matchea_jugador(
  p_perfil_id uuid,
  p_token text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles p
    WHERE p.id = p_perfil_id
      AND (
        public.perfil_texto_norm(p.nombre) LIKE
          '%' || public.perfil_texto_norm(p_token) || '%'
        OR public.perfil_texto_norm(p.apellido) LIKE
          '%' || public.perfil_texto_norm(p_token) || '%'
        OR coalesce(p.dni, '') ILIKE ('%' || p_token || '%')
        OR EXISTS (
          SELECT 1
          FROM public.licencias l
          WHERE l.usuario_id = p.id
            AND coalesce(l.nro_licencia::text, '') ILIKE ('%' || p_token || '%')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.perfil_coincide_busqueda_licencias(
  p_perfil_id uuid,
  p_tokens text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_tokens IS NULL OR cardinality(p_tokens) = 0 THEN true
    ELSE NOT EXISTS (
      SELECT 1
      FROM unnest(p_tokens) AS t(token)
      WHERE NOT public.perfil_token_matchea_jugador(p_perfil_id, t.token)
    )
  END;
$$;

DROP FUNCTION IF EXISTS public.licencias_resumen_jugadores(date, text, text, uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.licencias_resumen_jugadores(
  p_hoy date,
  p_tokens text[] DEFAULT NULL,
  p_provincia text DEFAULT NULL,
  p_asociacion_id uuid DEFAULT NULL
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
    WHERE public.perfil_coincide_busqueda_licencias(p.id, p_tokens)
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

DROP FUNCTION IF EXISTS public.licencias_perfiles_ids_paginados(
  int,
  int,
  date,
  text,
  text,
  text,
  uuid,
  uuid[]
);

CREATE OR REPLACE FUNCTION public.licencias_perfiles_ids_paginados(
  p_offset int,
  p_limit int,
  p_hoy date,
  p_tokens text[] DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_provincia text DEFAULT NULL,
  p_asociacion_id uuid DEFAULT NULL
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
    WHERE public.perfil_coincide_busqueda_licencias(p.id, p_tokens)
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

DROP FUNCTION IF EXISTS public.perfil_coincide_busqueda_licencias(uuid, text, uuid[]);

REVOKE ALL ON FUNCTION public.perfil_token_matchea_jugador(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.perfil_coincide_busqueda_licencias(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.licencias_resumen_jugadores(date, text[], text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.licencias_perfiles_ids_paginados(int, int, date, text[], text, text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.perfil_token_matchea_jugador(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.perfil_coincide_busqueda_licencias(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.licencias_resumen_jugadores(date, text[], text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.licencias_perfiles_ids_paginados(int, int, date, text[], text, text, uuid) TO service_role;