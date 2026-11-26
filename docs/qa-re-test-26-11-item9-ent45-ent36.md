# Re-test 26/11 — Item 9: ENT-45, ENT-36

## ENT-45 — Unir fichas por colisión de DNI

### Problema

Al corregir DNI como superadmin, un duplicado devolvía 409 sin acción para resolver el conflicto.

### Solución

- API: `fusionarFichasJugador` migra inscripciones, rankings (suma por categoría), licencias (si destino no tiene) y reservas; retira o archiva la ficha origen.
- API: `POST /perfil/:id/unir-ficha` (superadmin) con `ficha_destino_id` y `motivo`; auditoría `unir_fichas_jugador`.
- Web: al corregir DNI con 409, modal para unir fichas y redirigir a la ficha destino; `PerfilService.unirFicha`.

## ENT-36 — Baja de club sin historial operativo

### Problema

La licencia auto de club sin pagos impedía eliminar clubes vacíos.

### Solución

- `contarLicenciasClubConPagos`: solo cuenta licencias con filas en `licencias_club_pagos`.
- `eliminarClubDefinitivo`: valida historial real (jugadores, reservas, torneos, inscripciones) y limpia licencia, canchas/turnos/reservas y afiliaciones antes del `DELETE` del club.

## Tests

```bash
cd apps/api && node --experimental-strip-types --import ./test/register-ts-loader.mjs --test \
  test/ent45UnirFichas.test.ts \
  test/ent36EliminarClub.test.ts

pnpm --filter api build
```

QA manual sugerido:

1. Dos fichas con DNI distinto: corregir una al DNI de la otra, unir desde modal, ver inscripciones en destino.
2. Club QA sin torneos/jugadores/reservas y licencia sin pagos: baja definitiva (eliminado, no solo inactivo).