# Re-test 26/11 — Item 17: CLI-19, CLI-27, CLI-29

## CLI-19 — Mensaje de descanso al rechazar drop

- `validarAsignacionHorarioPartido`: distingue fin del feeder (orden de llave) vs descanso insuficiente; devuelve `mensajeDescansoInsuficienteProgramador` en lugar del mensaje genérico de orden.

## CLI-27 — Indicador Guardando y menos recargas

- `useProgramadorBoard`: `setSyncing(true)` en asignar, desasignar e intercambiar; respuesta del API aplica el board directo (sin `scheduleBoardSync` redundante).
- Intercambio fallido: solo revierte el estado local (sin refetch completo).
- `ProgramadorConfigBar` y `ProgramadorTopBar`: «Guardando…» visible con `syncing || busy`.

## CLI-29 — PUT partido con programación publicada

- `TorneoService.actualizarPartido`: si `programacion_estado === publicado` y cambia fecha/cancha, ejecuta `validarAsignacionHorarioPartido` (cancha ocupada, jugadores, descanso, orden de llave).

## Tests

```bash
cd apps/api && node --experimental-strip-types --import ./test/register-ts-loader.mjs --test \
  test/cli19MensajeDescanso.test.ts \
  test/cli29ActualizarPartidoPublicado.test.ts

cd apps/web && node --experimental-strip-types --test test/programadorCli7.test.ts
```