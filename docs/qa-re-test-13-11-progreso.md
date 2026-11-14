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

## Lote 4 — COMPLETADO (13/11/2026)

Commits:

- `5017990` — `fix(back): torneos lote 4 re-test 13/11 (llave, zonas, alta en partido)`
- `e98e940` — `fix(front): torneos lote 4 re-test 13/11 (editor llave, zonas, intercambio)`

Tickets: TOR-23, TOR-28, TOR-24, TOR-22, TOR-21, TOR-36, TOR-16.

### TOR-23 / TOR-28 / TOR-24 (back + front)

- Categoría por `torneo.nivel` en alta de llave e inscripción manual
- Validación FAP `W*` en edición de llave; sin bye automático si rival pendiente
- `guardarZonas` sincroniza llave, repara fixture de zona, resumen en auditoría
- Endpoint `POST /torneos/:id/reparar-fixture-zonas`
- Tests: `tor23InscripcionManualCategoria`, `tor28EdicionLlaveFap`, `tor24GuardarZonas`

### TOR-22 / TOR-21 / TOR-36 / TOR-16 (back + front)

- Alta de pareja al guardar partido (`alta_lado_a/b`); búsqueda con `excluidas_en_torneo` y debounce
- Cabezas de serie: `cabezas_ranking_globales` en GET zonas; avisos si validación impide guardar
- Etiquetas llave: `Por definir` vs `Libre`; auditoría de cruces secundarios en swap
- `trasladoParejaLlave` + modal «Confirmar intercambio»
- Tests: `tor22*`, `tor21*`, `tor36*`, `tor16*`

Pendiente: re-test manual del Lote 4.

## Lote 5 — COMPLETADO (13/11/2026)

Commits: `e8056a2` (back), `1571ea7` (front).

Tickets: TOR-27, TOR-34, TOR-4, TOR-33.

### TOR-27 — COMPLETADO (13/11/2026)

- `validarAsignacionHorarioPartido` antes de persistir en `PUT .../programacion/asignar` (orden de llave feeders + dependientes + conflictos graves del partido)
- Publicar ya bloqueaba `severity === "bad"`; la grilla sigue marcando conflictos vía `evaluateProgramacionIssues`
- Auto / «Cargar en la grilla» ya respetaba feeders (`slotRespetaDependientesProgramados`)
- Toast con descripción al rechazar drop manual inválido
- Tests: `apps/api/test/programador.paso5.test.ts` (TOR-27)

### TOR-34 — COMPLETADO (13/11/2026)

- `finWallClockTrasPartidos` suma `descanso_modo` al fin de zona (no solo el fin del partido)
- `notBeforeDesdeUltimaZonaPorEquipos` por pareja clasificada en auto-asignar y modo continuo
- `evaluateProgramacionIssues` marca conflicto grave si la llave arranca antes del descanso post-zona
- Duración de zona (`duracionParaFase` zonas) separada de la de llave en los cálculos
- Tests: `apps/api/test/programador.paso5.test.ts` (TOR-34)

### TOR-4 — COMPLETADO (13/11/2026)

- Auto-asignación: no programa cruces de llave hasta que sus feeders tienen horario (evita 25/26 con semis en 11:00)
- Regla 11:00: bloqueo (`bad`) en torneos provinciales/nacionales; advertencia (`wait`) en local/privado/regional/clasificatorio
- El asignador omite slots de zona que violan las 11:00 cuando la regla es obligatoria (oficial)
- `sugerirCanchasYHoras`: mensaje accionable (canchas extra, jornadas, adelantar inicio / extender cierre)
- Tests: `programador.paso5.test.ts` (TOR-4)

### TOR-33 — COMPLETADO (13/11/2026)

- `ScheduleGrid`: cabecera con asa de arrastre (`GripVertical`), título truncado y botón × con `z-30` (sin drag en toda la tarjeta)
- `ProgramadorVisualPage`: `FeedbackModal` al quitar — aclara que se persiste al instante y no requiere «Guardar borrador»
- Test: `apps/web/test/tor33ScheduleGrid.test.ts`

**Lote 5 — COMPLETADO** (TOR-27, TOR-34, TOR-4, TOR-33).

## Lote 6 — COMPLETADO (13/11/2026) — CLI-2, CLI-1

Commits: `437731e` (back), `246ea3c` (front).

### CLI-2 (canchas/sedes vs adheridos)

- Migraciones: `cli2_clubes_adherido_sedes`, `cli2_buscar_clubes_cercanos_adheridos`
- Backend: sedes `admin_club`, filtro `/reservar`, `promover-adherido`, init `torneo_sedes` + disponibilidad
- Front: dashboard clubes, errores API Paso1/Sedes
- Tests: `apps/api/test/cli2ClubesAdheridoSede.test.ts`

### CLI-1 (planillas oficiales)

- Plantillas en `apps/web/public/plantillas/inscripciones/`: `PLANILLA - FED NACIONAL.xls`, `PLANILLA - CLUB - ASOC PCIAL.xls`
- Parser: columna `PAREJAS`, `LCOALIDAD | PROVINCIA`, residencia en `lugar_residencia` vía `resolverProvinciaDesdePlanilla`
- Descarga: nombres legibles «Planilla de inscripción · …»
- Tests: `apps/api/test/cli1PlanillaOficial.test.ts`, `apps/web/test/cli1PlanillaUrls.test.ts`

## Lote 7 — COMPLETADO (13/11/2026)

Commits: `dc97a9f` (back), `73bb116` (front).

Tickets: ENZO-1, RES-15, ENZO-3, ENT-25, ENT-28, ENT-30, RES-17, RES-18, RES-19.

Pendiente: re-test manual (notificaciones club desktop, portada ~360px, redirect post-login, bloqueos vigentes, chat desde Mis reservas).

### ENZO-1 / RES-15 (panel club: dropdown notificaciones)

- **Estado:** COMPLETADO en código.
- `NotificationCenter`: panel con `createPortal` + ancla `fixed` (no se corta por `overflow-hidden` del layout club).
- Test: `apps/web/test/res15ClubNotificacionesDesktop.test.ts`.

### ENZO-3 (portada móvil / padding FAB)

- **Estado:** COMPLETADO en código.
- `globals.css`: solo `padding-bottom` en `.public-content-soporte-fab-safe` (sin `padding-right` ~72px).
- `HomePageClient`: márgenes `px-4` / `min-w-0` en hero y buscador.
- Tests: `apps/web/test/pub8ChatFlotanteMovil.test.ts`, `apps/web/test/enzo3PortadaMovil.test.ts`.

### ENT-25 (preferencias push en campañas)

- **Estado:** COMPLETADO en código.
- Backend: campañas `in_app` llaman `crearNotificacion` sin `forzarInApp`; si `push === false`, omitido (`omitido_prefs`).
- Front: `aria-label` + `role="switch"` en toggles de `mi-perfil/ajustes`.
- Tests: `apps/api/test/ent25PreferenciasPushCampana.test.ts`, `apps/web/test/ent25PreferenciasAjustes.test.ts`; ajuste `ent7ComunicacionesCanales.test.ts`.

### ENT-28 (redirect y fragmento tras login)

- **Estado:** COMPLETADO en código.
- Middleware: `redirect` con pathname + query en `/mi-perfil`, `/mensajes`, `/dashboard`, `/club`.
- Util `utils/auth/postLoginRedirect.ts`: ruta segura, `fragment=notificaciones`, persistencia OAuth en `sessionStorage`.
- Login (mail/Google) y callback OAuth restauran destino con hash.
- Test: `apps/web/test/ent28LoginRedirect.test.ts`.

### ENT-30 (panel comunicaciones)

- **Estado:** COMPLETADO en código.
- `ComunicacionesPanel`: WhatsApp deshabilitado como email; copy de mail; sin backticks en ayuda de link; rol `usuario` → "Jugador" en muestra de audiencia.
- Test: `apps/web/test/ent30ComunicacionesPanel.test.ts`.

### RES-17 (iconos listado clubes CRM)

- **Estado:** COMPLETADO en código.
- `dashboard/clubes/page.tsx`: `CheckCircle2` y `MapPin` con `shrink-0` + `self-start`; filas con `items-start`.
- Test: `apps/web/test/res17ClubesIconos.test.ts`.

### RES-18 (bloqueos activos vigentes/futuros)

- **Estado:** COMPLETADO en código.
- `ClubService.listarBloqueos`: con `soloActivos`, `fecha_fin >= hoy` (Argentina) por defecto.
- `BloquearHorariosModal`: pide listado con `desde=fechaHoyArgentina()`.
- Tests: `apps/api/test/res18BloqueosVigentes.test.ts`, `apps/web/test/res18BloqueosVigentes.test.ts`.

### RES-19 (chat: separadores, Club, ref. reserva)

- **Estado:** COMPLETADO en código.
- Separadores Hoy/Ayer/fecha en `ChatInbox` + `ChatSeparadorDia`.
- Header: `admin_club` → "Club".
- Desde Mis reservas: query `ref_*` + banner + borrador del mensaje.
- Test: `apps/web/test/res19ChatReservas.test.ts`.

## Lote 8 — SIGUIENTE

Tickets: PUB-22, PUB-20, PUB-21, PUB-16, App 1.0.0.

Plan: [re-test_13-11_correction_plan.md](re-test_13-11_correction_plan.md) y plan completo en Cursor (`re-test_13-11_correction_plan`).
