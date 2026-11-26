# Re-test 26/11 — Item 3: ENT-44 (ficha planilla + correo)

## Problema

Fichas cargadas por planilla quedaban con `pendiente_activacion = false`. Al cargar un correo real el jugador veía «cuenta activa» y la ficha dejaba de ser editable.

## Cambios

- Planilla / alta manual: `pendiente_activacion: true` hasta completar registro en la App.
- Admin (`PATCH ficha-provisoria`): mantiene `pendiente_activacion = true`; permite editar fichas legacy planilla sin login (`esFichaPlanillaSinActivar`).
- Preinscripción por DNI: padrón FAP solo si hay licencia FAP; mensaje de club si hay email/teléfono de verificación.
- Helpers: `cuentaPendienteActivacionApp`, `puedeEditarFichaProvisoriaAdmin`.

## Reparación QA ficha 99002432 (opcional en Supabase)

```sql
update perfiles
set pendiente_activacion = true,
    telefono = '2990002432',
    email = 'preinscripto+99002432@padelnexus.local'
where dni = '99002432';
```

(Ajustar email si corresponde al interno de planilla.)

## Tests

```bash
cd apps/api && node --experimental-strip-types --import ./test/register-ts-loader.mjs --test test/ent44FichaPlanillaActivacion.test.ts test/ent35ActivacionPadronFap.test.ts
```