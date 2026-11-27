-- TOR-56: visible en sitio público independiente de es_prueba (ranking).

alter table public.torneos
  add column if not exists visible_sitio_publico boolean not null default true;

comment on column public.torneos.visible_sitio_publico is
  'Si es false, el torneo no se lista en /torneos ni admite inscripción online pública.';

-- Compatibilidad: antes la visibilidad se codificaba con es_prueba.
update public.torneos
set visible_sitio_publico = (es_prueba = false);