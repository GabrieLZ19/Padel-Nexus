alter table public.grupo_parejas
  add column if not exists es_cabeza_serie boolean not null default false;

comment on column public.grupo_parejas.es_cabeza_serie is
  'Única cabeza de serie designada en la zona (override manual o siembra).';
