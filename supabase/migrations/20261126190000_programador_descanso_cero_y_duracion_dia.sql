-- Permitir descanso 0 (partidos seguidos) en torneos.descanso_modo
alter table public.torneos
  drop constraint if exists torneos_descanso_modo_check;

alter table public.torneos
  add constraint torneos_descanso_modo_check
  check (
    descanso_modo is null
    or descanso_modo in ('sin_descanso', 'tras_fin_60', 'tras_fin_120', 'entre_inicios_240')
  );

comment on column public.torneos.descanso_modo is
  'Modo de descanso del programador: sin_descanso | tras_fin_60 | tras_fin_120 | entre_inicios_240';

-- Duracion de partido por dia en disponibilidad de canchas
alter table public.torneo_canchas_disponibilidad
  add column if not exists duracion_partido_minutos integer;

alter table public.torneo_canchas_disponibilidad
  drop constraint if exists torneo_canchas_disponibilidad_duracion_check;

alter table public.torneo_canchas_disponibilidad
  add constraint torneo_canchas_disponibilidad_duracion_check
  check (
    duracion_partido_minutos is null
    or (duracion_partido_minutos >= 30 and duracion_partido_minutos <= 180)
  );

comment on column public.torneo_canchas_disponibilidad.duracion_partido_minutos is
  'Duracion de partido en minutos para esta jornada; si es null hereda torneos.duracion_partido_minutos';

-- Persistir si el torneo usa cabezas de serie activas
alter table public.torneos
  add column if not exists cabezas_serie_activas boolean not null default true;

comment on column public.torneos.cabezas_serie_activas is
  'Si es false, no se asignan ni validan cabezas de serie en las zonas del torneo';
