-- FEE-6: anular movimientos de fee al cancelar/rechazar inscripción

alter table public.plataforma_fee_movimientos
  drop constraint if exists plataforma_fee_movimientos_estado_check;

alter table public.plataforma_fee_movimientos
  add constraint plataforma_fee_movimientos_estado_check
  check (
    estado in (
      'pendiente_organizador',
      'cobrado_mp',
      'descontar_liquidacion',
      'liquidado',
      'anulado'
    )
  );

comment on column public.plataforma_fee_movimientos.estado is
  'Ledger: pendiente_organizador (deuda torneo off-platform), cobrado_mp, descontar_liquidacion, liquidado, anulado (inscripción cancelada/rechazada)';