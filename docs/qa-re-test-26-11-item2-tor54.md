# Re-test 26/11 — Item 2: TOR-54 (torneo gratuito)

## Problema

Inscripción manual en torneo gratuito quedaba `Pendiente`, el club no veía forma de confirmar en Paso 4 y «Generar cuadros» fallaba.

## Cambios

- API: `estadoPagoInicialInscripcion` confirma automáticamente en torneos sin costo (`es_gratis` o precio 0), en alta de jugador y en inscripción manual del club.
- API: generar zonas/cuadros no exige pago confirmado en torneos gratuitos.
- Web Paso 4: checkbox de confirmación también en torneos gratuitos (legacy pendientes) y contador de confirmadas.
- Web Paso 8: misma regla de no bloqueo por pago en gratuitos.

## Tests

```bash
cd apps/api && node --experimental-strip-types --import ./test/register-ts-loader.mjs --test test/tor54TorneoGratuitoInscripcion.test.ts
cd apps/web && node --experimental-strip-types --test test/tor54Paso4Gratuito.test.ts
```