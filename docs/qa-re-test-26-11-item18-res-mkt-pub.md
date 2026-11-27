# Re-test 26/11 — Ítem 18 (RES-24/25/26, MKT-11, PUB-31, TOR-69)

## RES-24 — Cancelación cobrada y reintegro

- **Back:** `ClubService.gestionarReservaClub` exige motivo (mín. 8 caracteres) si `estado_pago === completado`; al cancelar pasa a `reembolso_pendiente`. Acción `reembolsar` marca `reembolsado`.
- **Front:** Club (`app/club/reservas/page.tsx`) — modal con `inputMinLength` 8 si estaba pagada; filtros y acción «Marcar devuelta». Jugador (`mi-perfil/reservas`) — badges «A devolver» / «Devuelta» vía `etiquetaEstadoPagoReserva.ts`.

## RES-25 — Acceso a reserva

- **Back:** `utils/reservaAcceso.ts` + validación en `GET /reservas/:id`, preview MP y preferencia MP (`reserva.controller.ts`).

## MKT-11 — Comprador en checkout

- **Back:** `assertCompradorOrden` en `previewCheckoutOrden` y `crearPreferenciaMercadoPago` (controller con `req.user.id`).

## PUB-31 — Estado público del torneo

- **Back:** `fechasPrimerPartidoPorTorneo` en listado público y `obtenerPorId`; campo `fecha_primer_partido`.
- **Shared logic:** `estadoTorneoPublico.ts` (API + web).
- **Front:** Listado `/torneos` usa `vistaEstadoTorneoPublico` (Próximo/Programado hasta el día del 1.er partido; En curso / Ver en vivo desde ese día).

## TOR-69 / RES-26 — Pulido visual

- `ZonaCard.tsx`: `title` en nombres truncados de parejas.
- Etiquetas de pago unificadas en club y jugador.

## Tests

- `apps/api/test/res24ReembolsoCancelacion.test.ts`
- `apps/api/test/res25AccesoReserva.test.ts`
- `apps/api/test/mkt11CompradorOrden.test.ts`
- `apps/api/test/pub31EstadoTorneoPublico.test.ts`

Verificación local: tests ítem 18 OK; `pnpm run build` en `apps/api` OK.