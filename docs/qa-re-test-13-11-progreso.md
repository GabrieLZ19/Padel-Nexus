# Re-test final 13/11 — Progreso de corrección

Documento de seguimiento alineado con el plan en Cursor (`re-test_13-11_correction_plan`).

## Lote 1 — COMPLETADO

Commits: `c2eed1e` (back), `8763351` (front).

Tickets: PUB-19, PUB-18 (rate limit), PUB-15.

- Migración: `supabase/migrations/20261113200000_pub19_preinscripcion_activacion.sql`
- Token de un solo uso tras verificar preinscripción; registro exige `verification_token`
- Bloqueo por intentos fallidos de verificación (DNI)
- Rate limit por DNI + IP desde último hop de `X-Forwarded-For`
- Signup bloquea fichas sin verificar o sin métodos de verificación
- Tests: `apps/api/test/pub19PreinscripcionToken.test.ts`, `apps/api/test/pub15LicenciaClubPagos.test.ts`

## Lote 2 — COMPLETADO (13/11/2026)

### ENT-26 — COMPLETADO (13/11/2026)

- Migración: `supabase/migrations/20261113210000_ent26_licencia_pagos_periodo_anual.sql` (aplicada en Supabase)
- Check `licencia_pagos_periodo_check`: `YYYY` anual y `YYYY-MM` mensual
- Mensaje legible si falla el check; toasts sileo `z-index: 300` sobre `FeedbackModal`
- `LicenciaPagosHistorial`: extrae `error` / `message` de la API
- Test: `apps/api/test/ent26LicenciaPagosPeriodo.test.ts`

### ENT-21 — COMPLETADO (13/11/2026)

- `actualizarEstado` distingue `Pendiente → Activa` (aprobación) de `Suspendida/Vencida → Activa` (reactivación) usando estado efectivo
- Auditoría `reactivar_licencia` y push `"Licencia reactivada"` solo en reactivación
- CRM listado/ficha: feedback `"Licencia reactivada"` al reactivar (aprobación pendiente sin cambios)

### ENT-27 — COMPLETADO (13/11/2026)

- `exponeIdentidadVerificacionPublica`: menores sin titular/DNI en QR público aunque estén vigentes
- `GET /api/publico/licencias/verificar` con `optionalAuthenticate`: CRM/fiscal ven identidad con sesión
- Campo `identidad_reservada_menor` + aviso en `/verificar/[usuarioId]`
- Test: `apps/api/test/ent27VerificacionMenores.test.ts`

### ENT-29 — COMPLETADO (13/11/2026)

- Copy «Por ahora el pago es con Mercado Pago» sin mencionar transferencia si no hay alias/CBU
- `LicenciaModal` y cotización con `transferencia_disponible`
- `textoRepresentacionDesdeLicencia`: «Según tu licencia en trámite» vs activa
- Tests: `apps/web/test/ent29LicenciaCopy.test.ts`, `apps/api/test/ent29LicenciaCotizacionTransferencia.test.ts`

## Lotes 3–8 — PENDIENTE

Ver plan completo en Cursor.
