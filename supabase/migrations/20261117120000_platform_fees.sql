-- Fees de plataforma (cargo por servicio Padel Nexus)

create table if not exists public.plataforma_fee_canales (
  canal text primary key,
  tipo text not null default 'fijo' check (tipo in ('fijo', 'porcentaje')),
  valor numeric not null default 0 check (valor >= 0),
  activo boolean not null default true,
  actualizado_en timestamptz not null default now()
);

insert into public.plataforma_fee_canales (canal, tipo, valor)
values
  ('inscripciones', 'fijo', 0),
  ('licencias', 'fijo', 0),
  ('reservas', 'fijo', 0),
  ('marketplace', 'porcentaje', 0)
on conflict (canal) do nothing;

create table if not exists public.plataforma_fee_preferencias_org (
  id uuid primary key default gen_random_uuid(),
  org_tipo text not null check (org_tipo in ('club', 'asociacion', 'federacion')),
  org_id uuid not null,
  canal text not null references public.plataforma_fee_canales (canal) on update cascade,
  modo text not null default 'absorber' check (modo in ('absorber', 'sumar')),
  actualizado_en timestamptz not null default now(),
  unique (org_tipo, org_id, canal)
);

create table if not exists public.plataforma_fee_movimientos (
  id uuid primary key default gen_random_uuid(),
  canal text not null,
  org_tipo text not null,
  org_id uuid not null,
  entidad_tipo text not null,
  entidad_id text not null,
  torneo_id uuid references public.torneos (id) on delete set null,
  plazas_inscripcion smallint,
  monto_bruto numeric not null default 0,
  monto_fee numeric not null default 0,
  modo_fee text not null check (modo_fee in ('absorber', 'sumar')),
  estado text not null default 'pendiente_organizador'
    check (estado in ('pendiente_organizador', 'cobrado_mp', 'descontar_liquidacion', 'liquidado')),
  origen_pago text not null default 'manual'
    check (origen_pago in ('mp_online', 'manual', 'planilla', 'saldo_torneo')),
  mp_payment_id text,
  creado_en timestamptz not null default now(),
  unique (entidad_tipo, entidad_id, origen_pago)
);

create index if not exists plataforma_fee_movimientos_torneo_pendiente_idx
  on public.plataforma_fee_movimientos (torneo_id, estado)
  where torneo_id is not null and estado = 'pendiente_organizador';

create index if not exists plataforma_fee_movimientos_org_idx
  on public.plataforma_fee_movimientos (org_tipo, org_id, creado_en desc);

create table if not exists public.plataforma_liquidaciones (
  id uuid primary key default gen_random_uuid(),
  org_tipo text not null,
  org_id uuid not null,
  periodo_mes date not null,
  monto_bruto numeric not null default 0,
  monto_fees numeric not null default 0,
  monto_neto numeric not null default 0,
  cbu text,
  alias_cuenta text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'transferida')),
  marcado_por uuid references public.perfiles (id) on delete set null,
  marcado_en timestamptz,
  notas text,
  creado_en timestamptz not null default now()
);

create index if not exists plataforma_liquidaciones_org_periodo_idx
  on public.plataforma_liquidaciones (org_tipo, org_id, periodo_mes desc);

alter table public.plataforma_fee_canales enable row level security;
alter table public.plataforma_fee_preferencias_org enable row level security;
alter table public.plataforma_fee_movimientos enable row level security;
alter table public.plataforma_liquidaciones enable row level security;

comment on table public.plataforma_fee_canales is 'Fee global por canal (superadmin)';
comment on table public.plataforma_fee_preferencias_org is 'Modo absorber/sumar por organizador y canal';
comment on table public.plataforma_fee_movimientos is 'Ledger de cargos por servicio';
comment on table public.plataforma_liquidaciones is 'Liquidaciones manuales al CBU/alias del organizador';