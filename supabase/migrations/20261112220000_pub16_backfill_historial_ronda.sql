-- PUB-16: backfill de ronda en historial_ranking legacy (mejor partido por timestamp)

UPDATE public.historial_ranking hr
SET ronda = elegido.ronda
FROM (
  SELECT DISTINCT ON (hr2.id)
    hr2.id AS historial_id,
    p.ronda
  FROM public.historial_ranking hr2
  INNER JOIN public.inscripciones ins
    ON ins.torneo_id = hr2.torneo_id
   AND (ins.usuario_id = hr2.usuario_id OR ins.usuario2_id = hr2.usuario_id)
  INNER JOIN public.partidos p
    ON p.torneo_id = hr2.torneo_id
   AND p.ganador IS NOT NULL
   AND coalesce(p.ronda, '') <> ''
   AND (p.equipo_a_id = ins.id OR p.equipo_b_id = ins.id)
  WHERE coalesce(hr2.ronda, '') = ''
    AND hr2.torneo_id IS NOT NULL
  ORDER BY hr2.id, p.orden DESC NULLS LAST
) AS elegido
WHERE hr.id = elegido.historial_id
  AND coalesce(hr.ronda, '') = ''
  AND coalesce(elegido.ronda, '') <> '';
