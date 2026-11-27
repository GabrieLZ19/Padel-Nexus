-- FEE-24: baja auditable de inscripción pagada y seguimiento de reintegro

alter table public.inscripciones
  add column if not exists cancelada boolean not null default false,
  add column if not exists cancelada_at timestamptz,
  add column if not exists cancelada_por uuid references public.perfiles (id),
  add column if not exists motivo_cancelacion text,
  add column if not exists estado_reembolso text,
  add column if not exists reembolsado_at timestamptz,
  add column if not exists reembolsado_por uuid references public.perfiles (id);

alter table public.inscripciones
  drop constraint if exists inscripciones_estado_reembolso_check;

alter table public.inscripciones
  add constraint inscripciones_estado_reembolso_check
  check (
    estado_reembolso is null
    or estado_reembolso in ('pendiente', 'devuelto')
  );

comment on column public.inscripciones.cancelada is
  'FEE-24: baja lógica; la fila permanece visible para pagos y auditoría.';
comment on column public.inscripciones.estado_reembolso is
  'FEE-24: null | pendiente | devuelto cuando cancelada = true y hubo pago.';