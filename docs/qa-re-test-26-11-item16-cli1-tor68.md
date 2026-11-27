# Re-test 26/11 — Item 16: CLI-1 y TOR-68 (importador Excel)

## CLI-1 — Número de fila y listado de errores

- `filaInicioExcelDesdeSheetRef` y opción `filaInicioExcel` en `parsearFilasPlanilla` (número de fila alineado con Excel cuando la hoja empieza en `!ref` > A1).
- `leerPlanillaDesdeArchivo` (web) pasa el offset del `!ref`.
- Modal de importación: todos los errores (`scrollableDescription` en `FeedbackModal`), sin recorte a 5 filas.

## TOR-68 — DNI, formato de nombre y fichas

- Mensajes distintos: DNI vacío vs DNI con menos de 7 dígitos (`errorDniFilaPlanilla` en API y `resolverJugadorDesdePlanilla`).
- Advertencia con vista previa si el nombre no trae coma (`advertenciaNombreSinComaPlanilla`); toast antes de enviar al servidor.
- Validación previa por grupo (`erroresGrupoPlanillaImport`): cupo, DNI duplicados en la planilla, pareja incompleta; no se crean fichas si falla la prevalidación.
- Rollback de fichas provisionales creadas en un grupo si falla el registro de inscripción.

## Tests

```bash
cd apps/api && node --experimental-strip-types --import ./test/register-ts-loader.mjs --test \
  test/tor68Cli1PlanillaImport.test.ts \
  test/tor55PlanillaEncabezadoYFilas.test.ts \
  test/cli1PlanillaOficial.test.ts
```

## Archivos tocados

- `apps/api/src/utils/inscripcionPlanilla.ts`
- `apps/api/src/services/inscripcion.service.ts` (`importarDesdePlanilla`)
- `apps/api/src/services/perfil.service.ts`
- `apps/web/utils/inscripcionPlanilla.ts`
- `apps/web/utils/planillaImportErrores.ts`
- `apps/web/components/ui/FeedbackModal.tsx`
- `apps/web/components/torneos/wizard/Paso4Jugadores.tsx`
- `apps/web/app/dashboard/inscripciones/page.tsx`