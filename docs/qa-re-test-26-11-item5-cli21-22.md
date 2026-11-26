# Re-test 26/11 — Item 5: CLI-21 / CLI-22

## Problema

Faltaba descanso 0, duración distinta por día en zonas/llave y grilla de programación cada 15 minutos.

## Cambios

- API: `sin_descanso` en reglas de descanso; slots y asignación en grilla de 15 min; `duracionPorDia` / `duracionTurnoEnFecha` en auto-asignar.
- API: validación de franjas alineada a 15 min (`persistirFranjasProgramacion`).
- Migración ya en repo: `20261126190000_programador_descanso_cero_y_duracion_dia.sql`.
- Web: `ProgramadorConfigBar` ya exponía descanso 0, franjas 15 min y duración por día (sin cambio obligatorio en esta tanda).

## Tests

```bash
cd apps/api && pnpm exec node --experimental-strip-types --import ./test/register-ts-loader.mjs --test test/cli21y22DescansoYFranjas15m.test.ts
node --experimental-strip-types --test apps/web/test/cli21y22ProgramadorConfig.test.ts
```