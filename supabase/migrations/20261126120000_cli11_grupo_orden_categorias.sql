-- CLI-11: orden de prioridad de categorías en programador maestro del evento
alter table public.grupos_torneo
  add column if not exists programacion_orden_torneo_ids jsonb;

comment on column public.grupos_torneo.programacion_orden_torneo_ids is
  'Orden de prioridad (torneo id) para auto-asignación multi-categoría del evento';