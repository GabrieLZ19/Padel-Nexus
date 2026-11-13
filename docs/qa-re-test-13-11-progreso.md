# Re-test final 13/11 — Progreso de corrección

Documento de seguimiento alineado con el plan en Cursor (`re-test_13-11_correction_plan`).

## Lote 1 — COMPLETADO

Tickets: PUB-19, PUB-18 (rate limit), PUB-15.

- Migración: `supabase/migrations/20261113200000_pub19_preinscripcion_activacion.sql`
- Token de un solo uso tras verificar preinscripción; registro exige `verification_token`
- Bloqueo por intentos fallidos de verificación (DNI)
- Rate limit por DNI + IP desde último hop de `X-Forwarded-For`
- Signup bloquea fichas sin verificar o sin métodos de verificación
- Tests: `apps/api/test/pub19PreinscripcionToken.test.ts`, `apps/api/test/pub15LicenciaClubPagos.test.ts`

## Lote 2 — PENDIENTE

ENT-26, ENT-21, ENT-27, ENT-29 (ver plan en Cursor).

## Lotes 3–8 — PENDIENTE

Ver plan completo en Cursor.
