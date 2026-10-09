-- Alcance Clasificatorio para un torneo de club cuando no hay asociación provincial,
-- y pases de representación entre asociaciones.

alter table public.torneos drop constraint if exists torneos_alcance_check;
alter table public.torneos
  add constraint torneos_alcance_check
  check (
    alcance is null
    or alcance = any (
      array[
        'Nacional'::text,
        'Provincial'::text,
        'Regional'::text,
        'Local'::text,
        'Privado'::text,
        'Clasificatorio'::text
      ]
    )
  );

create table if not exists public.pases_representacion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  asociacion_origen_id uuid not null references public.asociaciones(id),
  asociacion_destino_id uuid not null references public.asociaciones(id),
  estado text not null default 'pendiente',
  motivo text not null,
  resuelto_por uuid references public.perfiles(id),
  created_at timestamptz not null default now(),
  resuelto_at timestamptz,
  constraint pases_representacion_estado_check
    check (estado = any (array['pendiente'::text, 'aprobado'::text, 'rechazado'::text, 'cancelado'::text])),
  constraint pases_representacion_distintas
    check (asociacion_origen_id <> asociacion_destino_id)
);

create unique index if not exists pases_representacion_un_pendiente
  on public.pases_representacion (usuario_id)
  where estado = 'pendiente';

alter table public.pases_representacion enable row level security;

revoke all on table public.pases_representacion from anon, authenticated;
