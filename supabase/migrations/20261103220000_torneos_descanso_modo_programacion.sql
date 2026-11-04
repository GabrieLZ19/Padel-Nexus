-- P2: persistir el descanso elegido en el programador visual
alter table public.torneos
  add column if not exists descanso_modo text;

comment on column public.torneos.descanso_modo is
  'Modo de descanso del programador: tras_fin_60 | tras_fin_120 | entre_inicios_240';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'torneos_descanso_modo_check'
  ) then
    alter table public.torneos
      add constraint torneos_descanso_modo_check
      check (
        descanso_modo is null
        or descanso_modo in ('tras_fin_60', 'tras_fin_120', 'entre_inicios_240')
      );
  end if;
end $$;
