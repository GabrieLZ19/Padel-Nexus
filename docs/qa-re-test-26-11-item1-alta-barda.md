# Re-test 26/11 — Item 1: Horarios Alta Barda

**Estado:** COMPLETADO en produccion (verificado 26/11/2026).

## Criterios del PDF

- Cargar grilla de Hector: 82 partidos en los tres torneos del 28-29/11.
- Publicar programacion sin que descanso 60 / 90 min bloquee la grilla ya cargada.
- Permitir operar el torneo (estado En curso, resultados).

## Verificacion en Supabase (App Padel)

| Torneo | Partidos | Con horario | `horario_bloqueado` | `programacion_estado` | Estado torneo |
|--------|----------|-------------|---------------------|------------------------|---------------|
| 28-29 NOV \| Alta Barda - 5 Libre | 19 | 19 | 19/19 | publicado | En curso |
| 28-29 NOV \| Alta Barda — 6 Damas | 29 | 29 | 29/29 | publicado | En curso |
| 28-29 NOV \| Alta Barda — 7 Damas | 34 | 34 | 34/34 | publicado | En curso |

Evento (`grupo_id` `e33e42df-e7d8-439e-9e81-00c3c87323a8`): 82 partidos en total.

## Artefactos en repo

- [horarios_alta_barda.sql](Alta%20Barda%20-%20horarios%20para%20cargar/horarios_alta_barda.sql)
- [horarios_alta_barda.csv](Alta%20Barda%20-%20horarios%20para%20cargar/horarios_alta_barda.csv)
- [asignar_lote_por_torneo.json](Alta%20Barda%20-%20horarios%20para%20cargar/asignar_lote_por_torneo.json)

## Test de regresion

`pnpm --filter api test -- test/altaBardaHorariosGrilla.test.ts`

## Nota

Descanso 0 y duracion por dia (CLI-21 / CLI-22) siguen pendientes para futuros torneos cargados por pantalla; este item se resolvio con carga SQL + `horario_bloqueado`.