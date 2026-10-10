-- Pedidos del jugador para cambiar DNI o categoría oficial.
-- La ficha no se modifica: la entidad resuelve el pedido.

create table if not exists public.solicitudes_cambio_ficha (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  campo text not null,
  valor_actual text,
  valor_pedido text not null,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now(),
  constraint solicitudes_cambio_ficha_campo_check
    check (campo = any (array['dni'::text, 'categoria'::text])),
  constraint solicitudes_cambio_ficha_estado_check
    check (estado = any (array['pendiente'::text, 'resuelto'::text]))
);

create unique index if not exists solicitudes_cambio_ficha_un_pendiente
  on public.solicitudes_cambio_ficha (usuario_id, campo)
  where estado = 'pendiente';

alter table public.solicitudes_cambio_ficha enable row level security;

revoke all on table public.solicitudes_cambio_ficha from anon, authenticated;
