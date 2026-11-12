-- ENT-17: contactos QA (example.com) y nombres con artefactos XML de planilla

update public.perfiles
set es_prueba = true
where coalesce(email, '') ~* '@example\.com$';

update public.perfiles
set
  nombre = btrim(regexp_replace(regexp_replace(coalesce(nombre, ''), '^<v\s*', '', 'i'), '<[^>]*>', '', 'g')),
  apellido = btrim(regexp_replace(regexp_replace(coalesce(apellido, ''), '^<v\s*', '', 'i'), '<[^>]*>', '', 'g')),
  categoria_padel = btrim(regexp_replace(regexp_replace(coalesce(categoria_padel::text, ''), '^<v\s*', '', 'i'), '<[^>]*>', '', 'g')),
  lugar_residencia = btrim(regexp_replace(regexp_replace(coalesce(lugar_residencia, ''), '^<v\s*', '', 'i'), '<[^>]*>', '', 'g'))
where coalesce(nombre, '') ~ '<'
   or coalesce(apellido, '') ~ '<'
   or coalesce(categoria_padel::text, '') ~ '<'
   or coalesce(lugar_residencia, '') ~ '<';

-- Cuentas example.com pasan a correo técnico (no comunicaciones reales)
update public.perfiles
set email = 'preinscripto+' || coalesce(nullif(regexp_replace(dni, '[^0-9]', '', 'g'), ''), substr(id::text, 1, 12)) || '@padelnexus.local'
where coalesce(email, '') ~* '@example\.com$'
  and length(coalesce(nullif(regexp_replace(dni, '[^0-9]', '', 'g'), ''), substr(id::text, 1, 12))) >= 7;

-- Residuo de etiquetas OOXML rotas (`<v>5º` -> `>5º`)
update public.perfiles
set
  categoria_padel = btrim(regexp_replace(coalesce(categoria_padel::text, ''), '^>\s*', '', 'g')),
  lugar_residencia = btrim(regexp_replace(coalesce(lugar_residencia, ''), '^>\s*', '', 'g')),
  nombre = btrim(regexp_replace(coalesce(nombre, ''), '^>\s*', '', 'g')),
  apellido = btrim(regexp_replace(coalesce(apellido, ''), '^>\s*', '', 'g')),
  telefono = btrim(regexp_replace(coalesce(telefono, ''), '^>\s*', '', 'g'))
where coalesce(categoria_padel::text, '') ~ '^>'
   or coalesce(lugar_residencia, '') ~ '^>'
   or coalesce(nombre, '') ~ '^>'
   or coalesce(apellido, '') ~ '^>'
   or coalesce(telefono, '') ~ '^>';
