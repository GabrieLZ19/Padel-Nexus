# Re-test 24/11 — Progreso de corrección

Plan activo: Re-test 24/11 (PDF Dylan, 24/11/2026).

## Ola 1 — Seguridad y pagos (FEE) — COMPLETADA

Commits: pendientes de push (back + front en este lote).

| Código | Estado | Tests |
|--------|--------|-------|
| FEE-13 | Reservas: `/pagar` solo transferencia/efectivo; retorno MP con titular y `validarPagoMercadoPago` | `fee13ReservaPagarMercadoPago.test.ts` |
| FEE-14 | Marketplace: `confirmarPagoOrdenRetorno`; sin mock ni `mobile-return` | `fee14ConfirmarMarketplaceMp.test.ts` |
| FEE-15 | Inscripción retorno MP; mensaje pago inexistente | `fee15ConfirmarInscripcionMp.test.ts` |
| FEE-16 | Superadmin redirigido desde `/dashboard/cargos-servicio` | `fee16CargosServicioSuperadmin.test.ts` |
| FEE-11 | CSV Finanzas: organización, entidad, comisión MP, neto | `fee11ReporteFinanzasCsv.test.ts` |

## Ola 2 — Torneos (bloqueantes 28/11) — PENDIENTE

Siguiente: TOR-51/TOR-4, TOR-52, TOR-49, TOR-48, TOR-22, TOR-24, CLI-1.