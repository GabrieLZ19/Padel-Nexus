-- Separa los datos de ensayo del sitio público.
-- El panel administrativo sigue viéndolos.

alter table public.torneos
  add column if not exists es_prueba boolean not null default false;

alter table public.perfiles
  add column if not exists es_prueba boolean not null default false;

update public.perfiles
set es_prueba = true
where coalesce(email, '') ~* '(\.test$|\.local$|prueba|demo[0-9]|whapy)'
   or (coalesce(nombre, '') || ' ' || coalesce(apellido, '')) ~* 'whapy';

update public.torneos
set es_prueba = true
where coalesce(nombre, '') ~* '(prue|\mqa\M|testing|\mdemo\M|auditor|^asdf)';

update public.torneos t
set es_prueba = true
where exists (
  select 1 from public.inscripciones i where i.torneo_id = t.id
)
and not exists (
  select 1
  from public.inscripciones i
  join public.perfiles p on p.id = i.usuario_id
  where i.torneo_id = t.id
    and p.es_prueba = false
);
