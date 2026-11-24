# Re-test 24/11 — Progreso de corrección

Plan activo: Re-test 24/11 (PDF Dylan, 24/11/2026).

## Ola 1 — Seguridad y pagos (FEE) — COMPLETADA

Commits: `fdf72f1` (back), `c300712` (front).

| Código | Estado | Tests |
|--------|--------|-------|
| FEE-13 | Reservas: `/pagar` solo transferencia/efectivo; retorno MP con titular y `validarPagoMercadoPago` | `fee13ReservaPagarMercadoPago.test.ts` |
| FEE-14 | Marketplace: `confirmarPagoOrdenRetorno`; sin mock ni `mobile-return` | `fee14ConfirmarMarketplaceMp.test.ts` |
| FEE-15 | Inscripción retorno MP; mensaje pago inexistente | `fee15ConfirmarInscripcionMp.test.ts` |
| FEE-16 | Superadmin redirigido desde `/dashboard/cargos-servicio` | `fee16CargosServicioSuperadmin.test.ts` |
| FEE-11 | CSV Finanzas: organización, entidad, comisión MP, neto | `fee11ReporteFinanzasCsv.test.ts` |

## Ola 2 — Torneos (bloqueantes 28/11) — EN CURSO

| Código | Estado | Tests |
|--------|--------|-------|
| TOR-51 / TOR-4 | Sincronía `dias_juego` al cambiar fechas (Paso 1/back); preselección Paso 3; aviso capacidad Paso 3 y generar cuadros | `tor51DiasCompetencia.test.ts`, `diasCompetenciaGeneracion.test.ts`, `tor51CapacidadDias.test.ts` |
| TOR-52 | Zona de 4 ganadores/perdedores: 1º–2º y 3º–4º solo por finales; sin sorteo falso | `tor52ZonaCuatroGanadoresPerdedores.test.ts` |
| TOR-49 | Aviso publicado: ignora cruces posteriores de llave y zonas ya cerradas al validar descanso | `tor49ProgramacionPublicada.test.ts` |

Siguiente en Ola 2: TOR-48, TOR-22, TOR-24, CLI-1.

### Nota operativa 28/11 (Alta Barda)

Los torneos reales con solo "Sáb 28" marcado deben corregirse guardando el Paso 1 con `fecha_fin` alineada al rango real (o forzar actualización de fechas) para que el backend regenere todos los días del rango; confirmar con Héctor antes de tocar datos productivos.