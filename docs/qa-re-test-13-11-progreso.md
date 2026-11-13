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

Commits: `d12a9bb` (back), `fce6268` (front).

Tickets: ENT-26, ENT-21, ENT-27, ENT-29.

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

## Lote 3 — COMPLETADO (13/11/2026)

Commits: `6edadd3` (back), `2b65108` (front).

Tickets: TOR-5, TOR-32, TOR-35, TOR-6.

### TOR-5 — COMPLETADO (13/11/2026)

- Migración: `supabase/migrations/20261113220000_tor5_partidos_fk_torneo_unica.sql` (aplicada en Supabase; elimina `partidos_torneo_id_fkey` duplicada)
- `procesarResultadoYAvance` y `actualizarPartido`: embed `torneos!fk_partidos_torneo(...)` + `throw` si falla la lectura previa (`previoError` / `partidoHorarioError`)
- `BracketEditor`: firma de marcadores ampliada (set3 / W.O.) para refrescar pestaña Auditoría
- Tests: `apps/api/test/tor5CorregirResultadoAuditoria.test.ts`, `apps/web/test/tor5CorregirResultadoAuditoria.test.ts`, `apps/api/test/tor5PartidosFkRegresion.test.ts`

### TOR-32 — COMPLETADO (13/11/2026)

- `seleccionarPartidosLlaveParaAutoprogramar`: con `programacion_estado === "publicado"` no mueve cancha/fecha existentes; solo autoprograma cruces nuevos sin horario
- Si el horario publicado queda en conflicto tras el avance, la API devuelve `avisos_programacion_publicada` y Paso Resultados muestra `sileo.warning`
- Tests: `apps/api/test/tor32ProgramacionPublicada.test.ts`, `apps/web/test/tor32ProgramacionPublicada.test.ts`

### TOR-35 — COMPLETADO (13/11/2026)

- `configuracionPuntosInicial()` con `puntos_activados: true` al crear torneo
- `inferirPuntosActivados` / ranking vinculado: default activo en Paso Cierre si no hay valor explícito en DB
- Aviso `avisos_ranking` al cargar la final sin puntos; Paso Resultados muestra warning
- `POST /torneos/:id/activar-puntos-ranking` con motivo, auditoría y `recalcularPuntosTorneoFinalizado`
- UI Paso Cierre: banner + botón post-cierre en torneos finalizados
- Tests: `apps/api/test/tor35PuntosRankingCierre.test.ts`, `apps/web/test/tor35PuntosCierreUi.test.ts`

### TOR-6 — COMPLETADO (13/11/2026)

- Puntos de torneos Local/Privado en `rankings.alcance = Local` vía `alcanceRankingDesdeTorneo`
- Jugadores de planilla no excluidos del ranking público (`esJugadorDePrueba` + `ranking_provisional`)
- `GET /rankings/:id`: calcula `posicion_actual` por alcance/categoría (`resolverPosicionEnRanking`)
- Ficha pública: posición sin query params; alcance Local como «Ranking del club»; scope por registro principal
- Tests: `apps/api/test/tor6RankingClub.test.ts`, `apps/web/test/tor6FichaPlanillaRanking.test.ts`

## Lotes 4–8 — PENDIENTE

Siguiente: **Lote 4** (TOR-28, TOR-24, TOR-23, TOR-22, TOR-21, TOR-36, TOR-16). Ver plan en Cursor.
