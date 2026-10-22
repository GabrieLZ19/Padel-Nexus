-- Migración: Registro y resolución auditable de empates y sorteos reglamentarios FAP en fase de zonas
alter table public.grupo_parejas
  add column if not exists sorteo_posicion integer default null,
  add column if not exists sorteo_motivo text default null,
  add column if not exists sorteo_aplicado_por uuid default null,
  add column if not exists sorteo_aplicado_at timestamptz default null;

comment on column public.grupo_parejas.sorteo_posicion is 'Posición asignada por sorteo reglamentario o resolución manual en caso de empate absoluto';
comment on column public.grupo_parejas.sorteo_motivo is 'Motivo o detalle del sorteo reglamentario registrado por el fiscal/admin';
comment on column public.grupo_parejas.sorteo_aplicado_por is 'ID del usuario/fiscal que aplicó el sorteo o resolución manual';
comment on column public.grupo_parejas.sorteo_aplicado_at is 'Momento en que se registró la resolución del sorteo';
