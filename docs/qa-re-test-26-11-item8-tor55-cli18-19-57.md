# Re-test 26/11 — Item 8: TOR-55, CLI-18, CLI-19, TOR-57

## TOR-55 + CLI-1 — Encabezado de planilla

- `esFilaEncabezadoPlanilla`: exige columna `DNI` y `APELLIDO`/`NOMBRE` o `PAREJAS` (ignora notas con la palabra DNI).
- Error unificado: `No se encontró el encabezado de la planilla.`
- `fila` en cada registro sigue siendo 1-indexed según fila Excel (encabezado puede estar en fila 5, datos en 6).
- API y web: `apps/api/src/utils/inscripcionPlanilla.ts`, `apps/web/utils/inscripcionPlanilla.ts`.

## CLI-18 — Drag en tarjeta del programador

- `ScheduleGrid`: `listeners`/`attributes` en la tarjeta completa (`select-none`, grip solo visual).
- `ZonaParejasPanel`: mismo patrón.
- `PendingMatchesSidebar` ya arrastraba desde toda la tarjeta.

## CLI-19 — Mensajes de descanso

- `mensajeDescansoInsuficienteProgramador` en `programadorReglas.ts`.
- `evaluateProgramacionIssues`: orden de llave si `inicio < fin_origen`; descanso si `inicio >= fin_origen` con texto `hacen falta X min, quedan Y min`.

## TOR-57 — Cabezas de serie

- Copy en `BracketEditor` y aviso en `Paso8Cuadros` sobre alcance del switch (guardar zonas + persistencia en torneo).
- `generarFaseGrupos`: `es_cabeza_serie` solo si `cabezas_serie_activas` del torneo está activo.

## Tests

```bash
cd apps/api && node --experimental-strip-types --import ./test/register-ts-loader.mjs --test \
  test/tor55PlanillaEncabezadoYFilas.test.ts \
  test/cli19MensajeDescanso.test.ts \
  test/cli1PlanillaOficial.test.ts

cd apps/web && node --experimental-strip-types --test \
  test/cli18DragTarjeta.test.ts \
  test/tor57CabezasSerie.test.ts

pnpm --filter api build
```

Sesión 26/11: **18 tests API + 6 tests Web, 0 fallos**; build API OK.