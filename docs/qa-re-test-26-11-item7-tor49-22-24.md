# Re-test 26/11 — Item 7: TOR-49, TOR-22, TOR-24

## Alcance

Tres hallazgos de llaves y arbitraje: falsos avisos de horarios publicados al cargar resultados, alta de pareja en pase directo FAP, y recálculo de cupos de llave al mover parejas entre zonas.

## TOR-49 — «Revisar horarios publicados» (falsos positivos)

### Problema

Al cargar resultados de octavos/cuartos con programación ya publicada, Paso Resultados mostraba el modal de aviso aunque el horario respetaba feeders y descanso (casos re-test 24/11: cuarto #21 y semi #24).

### Solución (ya en repo)

- `partidoViolaFeederODescansoPublicado` y `seleccionarPartidosLlaveParaAutoprogramar` en `apps/api/src/utils/programacionPartidos.ts`:
  - Omite partidos de llave ya finalizados y feeders ya jugados.
  - No penaliza cruces de zona posteriores aún sin jugar ni zonas con clasificación cerrada.
  - Octavos en paralelo en distinta cancha no generan conflicto de descanso.
- Tras cada resultado de llave, `TorneoService` llama `programarPartidosLlavePendientes` con `partidosNumeracion` (zonas + llave) para avisos con número visible (#21, no matchNo 58).
- UI: `Paso9Arbitraje.tsx` muestra `sileo.warning` solo si la API devuelve `avisos_programacion_publicada`.

## TOR-22 — Alta de pareja en pase directo

### Problema

No se podía ubicar una pareja nueva en el hueco rival de un pase directo (1A vs W*); la UI ofrecía acciones inválidas sobre el lado del clasificado.

### Solución (ya en repo)

- API: `LlaveAltaParejaService.ejecutarAltaDesdePayload`, rutas `llave/buscar-parejas` y `llave/alta-pareja`; materialización con `planificarMaterializacionByeFap` en edición de llave (`torneo.service.ts`).
- Web: `BracketEditor` + helpers en `fapPaseDirectoLlave` — alta solo en lado W*, protección del clasificado con `semilla_fap`.

## TOR-24 — Mover parejas entre zonas y llave FAP

### Problema

Al cambiar el tamaño efectivo de una zona (ej. B pasa a 2 parejas), la llave seguía exigiendo `2B` y no incorporaba plazas válidas (`2E`, `3E`).

### Solución (ya en repo)

- `fapZoneSeeds` / `fapBracketPlacement.proyectarSincronizacionHojasFap`: semillas según composición actual de zonas.
- `CompetenciaService.guardarZonas`: regeneración selectiva por firma de parejas, `sincronizarLlaveTrasCambioZonas`, desprogramación de zonas en conflicto con llave publicada, auditoría con `llave_sincronizada`.
- `playoffAvance`: no modifica hojas de llave ya finalizadas (ganador o estado Finalizado).
- Web: resumen de llave oculta slot `2B` inválido (`tor24ResumenLlaveZonas`).

## Verificación 26/11

```bash
cd apps/api && node --experimental-strip-types --import ./test/register-ts-loader.mjs --test \
  test/tor49ProgramacionPublicada.test.ts \
  test/tor32ProgramacionPublicada.test.ts \
  test/tor46NumerosVisiblesAvisos.test.ts \
  test/tor22LlaveAltaPareja.test.ts \
  test/tor22ByeMaterializacion.test.ts \
  test/tor24GuardarZonas.test.ts

cd apps/web && node --experimental-strip-types --test \
  test/fapPaseDirectoLlave.test.ts \
  test/tor22LlaveAltaPareja.test.ts \
  test/tor24ResumenLlaveZonas.test.ts \
  test/tor32ProgramacionPublicada.test.ts

pnpm --filter api build
```

Resultado sesión 26/11: **37 tests API + 9 tests Web, 0 fallos**; build API OK.

## QA manual sugerido (post-deploy)

1. Torneo publicado FAP 16 parejas: cargar resultado de cuarto sin que aparezca aviso si feeders ya jugaron.
2. Octavo 1A vs W50: alta de pareja menor en lado rival; ganador avanza al cuarto correcto.
3. Mover pareja entre zonas (B de 4 a 2): confirmar que desaparece `2B` del resumen y la llave ofrece semillas válidas (`2E` según caso).