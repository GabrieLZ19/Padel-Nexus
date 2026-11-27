-- ENT-42: saneo de U+FFFD en fichas provisorias del padrón FAP (Latin-1 leído como UTF-8).
-- Idempotente. No modifica fichas con pendiente_activacion = false.
-- Cobertura completa de nombres/localidades: ejecutar además
--   pnpm --filter api import:padron-fap -- "ruta/padron.html" --solo-sanear
-- (usa decodificarHtmlPadronFap + construirPatchPerfilPadronFap).

CREATE OR REPLACE FUNCTION public.ent42_sanear_fffd_en_texto(p_texto text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text := coalesce(p_texto, '');
  r text := U&'\FFFD';
BEGIN
  IF position(r in t) = 0 THEN
    RETURN p_texto;
  END IF;

  -- Apellidos y nombres frecuentes (alta confianza).
  t := replace(t, 'Mu' || r || 'oz', 'Muñoz');
  t := replace(t, 'Nu' || r || 'ez', 'Nuñez');
  t := replace(t, 'Garc' || r || 'a', 'García');
  t := replace(t, 'L' || r || 'pez', 'López');
  t := replace(t, 'Rodr' || r || 'guez', 'Rodríguez');
  t := replace(t, 'Gonz' || r || 'lez', 'González');
  t := replace(t, 'Mart' || r || 'nez', 'Martínez');
  t := replace(t, 'Fern' || r || 'ndez', 'Fernández');
  t := replace(t, 'S' || r || 'nchez', 'Sánchez');
  t := replace(t, 'G' || r || 'mez', 'Gómez');
  t := replace(t, 'Ram' || r || 'rez', 'Ramírez');
  t := replace(t, 'Iba' || r || 'ez', 'Ibañez');
  t := replace(t, 'Casta' || r || 'o', 'Castaño');
  t := replace(t, 'Pe' || r || 'aloza', 'Peñaloza');
  t := replace(t, 'Ag' || r || 'ero', 'Agüero');
  t := replace(t, 'Ca' || r || 'ete', 'Cañete');
  t := replace(t, 'P' || r || 'rez', 'Pérez');

  -- Nombres frecuentes.
  t := replace(t, 'Jos' || r || ' ', 'José ');
  t := replace(t, 'Jos' || r, 'José');
  t := replace(t, 'Mar' || r || 'a ', 'María ');
  t := replace(t, 'Mar' || r || 'a', 'María');
  t := replace(t, 'Nicol' || r || 's', 'Nicolás');
  t := replace(t, 'Mart' || r || 'n', 'Martín');
  t := replace(t, 'Agust' || r || 'n', 'Agustín');
  t := replace(t, 'Sof' || r || 'a', 'Sofía');
  t := replace(t, 'Mat' || r || 'as', 'Matías');
  t := replace(t, 'Tom' || r || 's', 'Tomás');
  t := replace(t, 'Sebasti' || r || 'n', 'Sebastián');
  t := replace(t, 'Jes' || r || 's', 'Jesús');
  t := replace(t, 'Gast' || r || 'n', 'Gastón');
  t := replace(t, 'Joaqu' || r || 'n', 'Joaquín');
  t := replace(t, 'Germ' || r || 'n', 'Germán');
  t := replace(t, 'Iv' || r || 'n', 'Iván');
  t := replace(t, 'Dar' || r || 'o', 'Darío');
  t := replace(t, 'Ver' || r || 'nica', 'Verónica');
  t := replace(t, 'Roc' || r || 'o', 'Rocío');
  t := replace(t, 'Bel' || r || 'n', 'Belén');
  t := replace(t, r || 'lvarez', 'Álvarez');
  t := replace(t, r || 'ngel ', 'Ángel ');

  -- Localidades (ciudad o tramo izquierdo antes de la provincia).
  t := replace(t, 'Neuqu' || r || 'n', 'Neuquén');
  t := replace(t, 'C' || r || 'rdoba', 'Córdoba');
  t := replace(t, 'Paran' || r, 'Paraná');
  t := replace(t, 'Concepci' || r || 'n', 'Concepción');
  t := replace(t, 'Constituci' || r || 'n', 'Constitución');
  t := replace(t, 'Bol' || r || 'var', 'Bolívar');
  t := replace(t, 'Pehuaj' || r, 'Pehuajó');
  t := replace(t, 'Jun' || r || 'n', 'Junín');
  t := replace(t, 'Olavarr' || r || 'a', 'Olavarría');
  t := replace(t, 'Lober' || r || 'a', 'Lobería');
  t := replace(t, 'Am' || r || 'rica', 'América');
  t := replace(t, 'Maci' || r, 'Maciá');
  t := replace(t, 'Nogoy' || r, 'Nogoyá');
  t := replace(t, 'Bah' || r || 'a Blanca', 'Bahía Blanca');

  RETURN t;
END;
$$;

UPDATE public.perfiles p
SET
  nombre = public.ent42_sanear_fffd_en_texto(p.nombre),
  apellido = public.ent42_sanear_fffd_en_texto(p.apellido),
  lugar_residencia = public.ent42_sanear_fffd_en_texto(p.lugar_residencia)
WHERE p.pendiente_activacion = true
  AND (
    coalesce(p.nombre, '') LIKE '%' || U&'\FFFD' || '%'
    OR coalesce(p.apellido, '') LIKE '%' || U&'\FFFD' || '%'
    OR coalesce(p.lugar_residencia, '') LIKE '%' || U&'\FFFD' || '%'
  );

-- Provincias en sufijo de lugar_residencia.
UPDATE public.perfiles p
SET lugar_residencia = CASE
  WHEN lugar_residencia ~ ', Entre Rios$' THEN regexp_replace(lugar_residencia, ', Entre Rios$', ', Entre Ríos')
  WHEN lugar_residencia ~ ', Cordoba$' THEN regexp_replace(lugar_residencia, ', Cordoba$', ', Córdoba')
  WHEN lugar_residencia ~ ', Rio Negro$' THEN regexp_replace(lugar_residencia, ', Rio Negro$', ', Río Negro')
  WHEN lugar_residencia ~ ', Tucuman$' THEN regexp_replace(lugar_residencia, ', Tucuman$', ', Tucumán')
  ELSE lugar_residencia
END
WHERE p.pendiente_activacion = true
  AND coalesce(p.lugar_residencia, '') <> ''
  AND (
    lugar_residencia ~ ', Entre Rios$'
    OR lugar_residencia ~ ', Cordoba$'
    OR lugar_residencia ~ ', Rio Negro$'
    OR lugar_residencia ~ ', Tucuman$'
  );