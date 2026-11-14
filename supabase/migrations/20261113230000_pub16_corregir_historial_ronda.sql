-- PUB-16: corregir `ronda` en historial_ranking (backfill previo usaba MAX(orden) → FINAL erróneo)

WITH participacion AS (
  SELECT DISTINCT
    u.uid AS usuario_id,
    p.torneo_id,
    p.id AS partido_id,
    trim(p.ronda) AS ronda,
    p.orden,
    p.fecha_partido,
    CASE
      WHEN upper(trim(coalesce(p.ronda, ''))) LIKE 'ZONA%' THEN 0
      ELSE 1
    END AS fase_zona,
    CASE upper(trim(coalesce(p.ronda, '')))
      WHEN '32AVOS' THEN 1
      WHEN '16AVOS' THEN 2
      WHEN 'PRELIMINARES' THEN 3
      WHEN 'OCTAVOS' THEN 4
      WHEN 'CUARTOS' THEN 5
      WHEN 'SEMIS' THEN 6
      WHEN 'FINAL' THEN 7
      ELSE 99
    END AS fase_llave
  FROM public.partidos p
  INNER JOIN public.inscripciones ins
    ON (p.equipo_a_id = ins.id OR p.equipo_b_id = ins.id)
  INNER JOIN public.torneos t ON t.id = p.torneo_id
  CROSS JOIN LATERAL (
    SELECT ins.usuario_id AS uid
    UNION ALL
    SELECT ins.usuario2_id WHERE ins.usuario2_id IS NOT NULL
  ) u
  WHERE p.ganador IS NOT NULL
    AND coalesce(trim(p.ronda), '') <> ''
    AND NOT (
      upper(trim(coalesce(p.ronda, ''))) LIKE 'ZONA%'
      AND coalesce((t.configuracion_puntos ->> 'puntos_zona')::numeric, 0) <= 0
    )
),
partidos_rn AS (
  SELECT
    usuario_id,
    torneo_id,
    partido_id,
    ronda,
    fecha_partido,
    row_number() OVER (
      PARTITION BY usuario_id, torneo_id
      ORDER BY fase_zona, fase_llave, orden ASC NULLS LAST, partido_id
    ) AS rn,
    count(*) OVER (PARTITION BY usuario_id, torneo_id) AS cnt_partidos
  FROM participacion
),
historial_rn AS (
  SELECT
    hr.id,
    hr.usuario_id,
    hr.torneo_id,
    hr.created_at,
    row_number() OVER (
      PARTITION BY hr.usuario_id, hr.torneo_id
      ORDER BY hr.created_at ASC NULLS LAST, hr.id
    ) AS rn,
    count(*) OVER (PARTITION BY hr.usuario_id, hr.torneo_id) AS cnt_hist
  FROM public.historial_ranking hr
  WHERE hr.torneo_id IS NOT NULL
),
emparejados AS (
  SELECT
    h.id AS historial_id,
    p.ronda AS ronda_nueva
  FROM historial_rn h
  INNER JOIN partidos_rn p
    ON p.usuario_id = h.usuario_id
   AND p.torneo_id = h.torneo_id
   AND p.rn = h.rn
  WHERE h.cnt_hist = p.cnt_partidos
),
proximidad AS (
  SELECT DISTINCT ON (h.id)
    h.id AS historial_id,
    trim(part.ronda) AS ronda_nueva
  FROM historial_rn h
  INNER JOIN participacion part
    ON part.usuario_id = h.usuario_id
   AND part.torneo_id = h.torneo_id
  WHERE NOT EXISTS (
    SELECT 1 FROM emparejados e WHERE e.historial_id = h.id
  )
  ORDER BY
    h.id,
    abs(
      extract(
        epoch
        FROM (
          coalesce(part.fecha_partido, h.created_at)
          - coalesce(h.created_at, part.fecha_partido)
        )
      )
    ) ASC NULLS LAST,
    part.fase_zona,
    part.fase_llave,
    part.orden ASC NULLS LAST,
    part.partido_id
),
resolucion AS (
  SELECT historial_id, ronda_nueva FROM emparejados
  UNION ALL
  SELECT px.historial_id, px.ronda_nueva
  FROM proximidad px
  INNER JOIN historial_rn h ON h.id = px.historial_id
  WHERE h.cnt_hist <> (
    SELECT pr.cnt_partidos
    FROM partidos_rn pr
    WHERE pr.usuario_id = h.usuario_id
      AND pr.torneo_id = h.torneo_id
    LIMIT 1
  )
)
UPDATE public.historial_ranking hr
SET ronda = r.ronda_nueva
FROM resolucion r
WHERE hr.id = r.historial_id
  AND coalesce(trim(hr.ronda), '') IS DISTINCT FROM coalesce(trim(r.ronda_nueva), '');

WITH participacion AS (
  SELECT DISTINCT
    u.uid AS usuario_id,
    p.torneo_id,
    p.id AS partido_id,
    trim(p.ronda) AS ronda,
    p.orden,
    p.fecha_partido,
    CASE
      WHEN upper(trim(coalesce(p.ronda, ''))) LIKE 'ZONA%' THEN 0
      ELSE 1
    END AS fase_zona,
    CASE upper(trim(coalesce(p.ronda, '')))
      WHEN '32AVOS' THEN 1
      WHEN '16AVOS' THEN 2
      WHEN 'PRELIMINARES' THEN 3
      WHEN 'OCTAVOS' THEN 4
      WHEN 'CUARTOS' THEN 5
      WHEN 'SEMIS' THEN 6
      WHEN 'FINAL' THEN 7
      ELSE 99
    END AS fase_llave
  FROM public.partidos p
  INNER JOIN public.inscripciones ins
    ON (p.equipo_a_id = ins.id OR p.equipo_b_id = ins.id)
  INNER JOIN public.torneos t ON t.id = p.torneo_id
  CROSS JOIN LATERAL (
    SELECT ins.usuario_id AS uid
    UNION ALL
    SELECT ins.usuario2_id WHERE ins.usuario2_id IS NOT NULL
  ) u
  WHERE p.ganador IS NOT NULL
    AND coalesce(trim(p.ronda), '') <> ''
    AND NOT (
      upper(trim(coalesce(p.ronda, ''))) LIKE 'ZONA%'
      AND coalesce((t.configuracion_puntos ->> 'puntos_zona')::numeric, 0) <= 0
    )
),
partidos_rn AS (
  SELECT
    usuario_id,
    torneo_id,
    partido_id,
    ronda,
    fecha_partido,
    row_number() OVER (
      PARTITION BY usuario_id, torneo_id
      ORDER BY fase_zona, fase_llave, orden ASC NULLS LAST, partido_id
    ) AS rn,
    count(*) OVER (PARTITION BY usuario_id, torneo_id) AS cnt_partidos
  FROM participacion
),
historial_rn AS (
  SELECT
    hr.id,
    hr.usuario_id,
    hr.torneo_id,
    hr.created_at,
    row_number() OVER (
      PARTITION BY hr.usuario_id, hr.torneo_id
      ORDER BY hr.created_at ASC NULLS LAST, hr.id
    ) AS rn,
    count(*) OVER (PARTITION BY hr.usuario_id, hr.torneo_id) AS cnt_hist
  FROM public.historial_ranking hr
  WHERE hr.torneo_id IS NOT NULL
),
emparejados AS (
  SELECT h.id AS historial_id
  FROM historial_rn h
  INNER JOIN partidos_rn p
    ON p.usuario_id = h.usuario_id
   AND p.torneo_id = h.torneo_id
   AND p.rn = h.rn
  WHERE h.cnt_hist = p.cnt_partidos
),
proximidad AS (
  SELECT DISTINCT ON (h.id) h.id AS historial_id
  FROM historial_rn h
  INNER JOIN participacion part
    ON part.usuario_id = h.usuario_id
   AND part.torneo_id = h.torneo_id
  WHERE NOT EXISTS (
    SELECT 1 FROM emparejados e WHERE e.historial_id = h.id
  )
  ORDER BY
    h.id,
    abs(
      extract(
        epoch
        FROM (
          coalesce(part.fecha_partido, h.created_at)
          - coalesce(h.created_at, part.fecha_partido)
        )
      )
    ) ASC NULLS LAST,
    part.fase_zona,
    part.fase_llave,
    part.orden ASC NULLS LAST,
    part.partido_id
),
resolucion AS (
  SELECT historial_id FROM emparejados
  UNION
  SELECT px.historial_id
  FROM proximidad px
  INNER JOIN historial_rn h ON h.id = px.historial_id
  WHERE h.cnt_hist <> (
    SELECT pr.cnt_partidos
    FROM partidos_rn pr
    WHERE pr.usuario_id = h.usuario_id
      AND pr.torneo_id = h.torneo_id
    LIMIT 1
  )
),
ambiguo AS (
  SELECT h.id
  FROM historial_rn h
  WHERE NOT EXISTS (SELECT 1 FROM resolucion r WHERE r.historial_id = h.id)
)
UPDATE public.historial_ranking hr
SET ronda = NULL
FROM ambiguo a
WHERE hr.id = a.id;
