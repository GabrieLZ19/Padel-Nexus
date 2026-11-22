-- FEE-9: pago de inscripción por plaza (jugador)

create table if not exists public.inscripcion_plazas_pago (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones (id) on delete cascade,
  numero_plaza smallint not null check (numero_plaza in (1, 2)),
  usuario_id uuid references public.perfiles (id) on delete set null,
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente', 'Confirmado', 'Rechazado')),
  monto numeric not null default 0,
  mp_payment_id text,
  pagado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (inscripcion_id, numero_plaza)
);

create unique index if not exists inscripcion_plazas_pago_mp_payment_id_idx
  on public.inscripcion_plazas_pago (mp_payment_id)
  where mp_payment_id is not null;

create index if not exists inscripcion_plazas_pago_inscripcion_idx
  on public.inscripcion_plazas_pago (inscripcion_id);

alter table public.inscripcion_plazas_pago enable row level security;

comment on table public.inscripcion_plazas_pago is
  'Estado de pago por jugador/plaza; la inscripción se confirma cuando todas las plazas están pagadas.';