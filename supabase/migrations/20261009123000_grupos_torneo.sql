-- Agrupa torneos de una misma competencia (nacional, provincial o fecha de club).
create table if not exists public.grupos_torneo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

alter table public.torneos
  add column if not exists grupo_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'torneos_grupo_id_fkey'
  ) then
    alter table public.torneos
      add constraint torneos_grupo_id_fkey
      foreign key (grupo_id)
      references public.grupos_torneo (id)
      on delete set null;
  end if;
end $$;

create index if not exists torneos_grupo_id_idx on public.torneos (grupo_id);

alter table public.grupos_torneo enable row level security;

revoke all on table public.grupos_torneo from anon, authenticated;
