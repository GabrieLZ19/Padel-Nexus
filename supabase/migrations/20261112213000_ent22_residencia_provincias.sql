-- ENT-22: normalizar lugar_residencia importado en mayúsculas / sin acentos

WITH canon AS (
  SELECT * FROM (
    VALUES
      ('Buenos Aires', 'buenos aires'),
      ('CABA', 'caba'),
      ('Catamarca', 'catamarca'),
      ('Chaco', 'chaco'),
      ('Chubut', 'chubut'),
      ('Córdoba', 'cordoba'),
      ('Corrientes', 'corrientes'),
      ('Entre Ríos', 'entre rios'),
      ('Formosa', 'formosa'),
      ('Jujuy', 'jujuy'),
      ('La Pampa', 'la pampa'),
      ('La Rioja', 'la rioja'),
      ('Mendoza', 'mendoza'),
      ('Misiones', 'misiones'),
      ('Neuquén', 'neuquen'),
      ('Río Negro', 'rio negro'),
      ('Salta', 'salta'),
      ('San Juan', 'san juan'),
      ('San Luis', 'san luis'),
      ('Santa Cruz', 'santa cruz'),
      ('Santa Fe', 'santa fe'),
      ('Santiago del Estero', 'santiago del estero'),
      ('Tierra del Fuego', 'tierra del fuego'),
      ('Tucumán', 'tucuman')
  ) AS t(display, norm)
),
perfil_norm AS (
  SELECT
    id,
    lugar_residencia,
    lower(
      trim(
        translate(
          lugar_residencia,
          'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑáàäâãéèëêíìïîóòöôõúùüûñ',
          'AAAAAEEEEIIIIOOOOOUUUUNaaaaaeeeeiiiiooooouuuun'
        )
      )
    ) AS norm
  FROM public.perfiles
  WHERE coalesce(lugar_residencia, '') <> ''
)
UPDATE public.perfiles p
SET lugar_residencia = canon.display
FROM perfil_norm pn
JOIN canon ON canon.norm = pn.norm
WHERE p.id = pn.id
  AND p.lugar_residencia IS DISTINCT FROM canon.display;
