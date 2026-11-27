# Re-test 27/11 — progreso

Plan maestro: `.cursor/plans/re-test_27-11_correcciones_y_tests_73809b00.plan.md`

## Oleada 2 (ítems 12–14)

| Ítem | Estado | Tests / notas |
|------|--------|----------------|
| RES-27 / RES-24 | Hecho | `res24ReembolsoCancelacion.test.ts` |
| FEE-24 | Hecho | Migración `20261127130000_fee24_*` (aplicada Supabase); `fee24BajaInscripcionPagada.test.ts` |
| ENT-48 | Hecho | Migración `20261127140000_ent48_*` (aplicada Supabase); `ent48y50FusionFichas.test.ts`, `ent464748UnirFichas.test.ts` |

## Oleada 3 — ítem 15 (TOR-73, TOR-68, TOR-56)

| Ítem | Estado | Tests / notas |
|------|--------|----------------|
| TOR-73 | Hecho | `torneoUsaMarcasReglamentoFederacion`; `oleada3Item15Tor73Tor56.test.ts` |
| TOR-68 | Hecho | Planilla + API orden duplicado/cupos; `tor68Cli1PlanillaImport.test.ts` |
| TOR-56 | Hecho | `Paso7Cierre`, tipo `Inscripción planilla`; `tor56Paso7CierrePrueba.test.ts` |

## Pendiente

- Oleada 3 ítems 16–18 (PUB, FEE, RES/ENT menores).
- Validación final: `pnpm --filter api test` completo (suite global con fallos previos ajenos), lint/build web.