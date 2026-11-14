-- CLI-2: el listado geografico de reservas solo incluye clubes adheridos.

CREATE OR REPLACE FUNCTION public.buscar_clubes_cercanos(
  user_lat double precision,
  user_lng double precision,
  max_distancia_km double precision DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  nombre character varying,
  provincia text,
  localidad text,
  canchas integer,
  estado text,
  latitud double precision,
  longitud double precision,
  distancia_km double precision
)
LANGUAGE sql
AS $function$
  SELECT
    c.id,
    c.nombre,
    c.provincia,
    c.localidad,
    c.canchas,
    c.estado,
    c.latitud,
    c.longitud,
    (
      6371 * acos(
        LEAST(
          1.0,
          cos(radians(user_lat)) * cos(radians(c.latitud)) *
          cos(radians(c.longitud) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(c.latitud))
        )
      )
    ) AS distancia_km
  FROM public.clubes c
  WHERE c.estado = 'Activo'
    AND c.es_adherido = true
    AND c.latitud IS NOT NULL
    AND c.longitud IS NOT NULL
    AND (
      6371 * acos(
        LEAST(
          1.0,
          cos(radians(user_lat)) * cos(radians(c.latitud)) *
          cos(radians(c.longitud) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(c.latitud))
        )
      )
    ) <= max_distancia_km
  ORDER BY distancia_km;
$function$;
