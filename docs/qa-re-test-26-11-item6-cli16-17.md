# Re-test 26/11 — Item 6: CLI-16 / CLI-17

## Problema

- **CLI-16:** Auto-asignar en evento multi-categoría era lento (muchas recargas de board y orden subóptimo).
- **CLI-17:** Intercambio de horarios en el programador hacía desasignar + dos asignar; si fallaba el segundo, la BD quedaba inconsistente.

## Cambios

- API: `ProgramacionEventoService.autoAsignar` fuerza `zonas_primero`, `omitirBoard`, dos pasadas (zonas/llave) y refresco de ocupados entre categorías.
- API (fix 26/11, `771be9b`): `horarioInicialDraftAutoAsignar` / `debePersistirHorarioAutoAsignar` — la pasada `llave` ya no borra horarios de zona en BD.
- API: `PUT .../programacion/intercambiar` (torneo y grupo evento); validación previa y persistencia con rollback (`programacionIntercambio.ts`).
- Web: `useProgramadorBoard` usa intercambio atómico; en error restaura estado local y pide board al servidor.

## Tests

```bash
cd apps/api && pnpm exec node --experimental-strip-types --import ./test/register-ts-loader.mjs --test test/cli16y17ProgramadorEvento.test.ts
node --experimental-strip-types --test apps/web/test/cli17IntercambioRollbackUi.test.ts
pnpm --filter api build
```