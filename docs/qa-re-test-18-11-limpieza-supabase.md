# Re-test 18/11 — Limpieza QA (bloque 6)

Proyecto Supabase: `tsmgxvygmdskhyhnjqvv` (sa-east-1). Ejecutado: 2026-11-22.

## FEE-2 (PAD-BMZ7RD / qa.padel2)

| Ítem | Estado |
|------|--------|
| Licencia `PAD-BMZ7RD` → pago pendiente | Ya estaba: `estado=Pendiente`, `datos_solicitud.estado_pago=pendiente` |
| Movimiento `e0a666a4-9b52-49e4-ad34-14563c71c36f` | No existía (previo cleanup) |
| Liquidación falsa Asociación Riojana | Sin registros recientes / no encontrada |

## FEE-6 — fees `QA Prueba – Club Elim 5ª`

Eliminados 6 movimientos en `plataforma_fee_movimientos` (torneo `a4d3af99-f3bf-4407-b627-9133f954f5c6`).

## Torneos QA 18/11

Eliminados (cascade hijos + `historial_ranking` previo):

- `e0227317-fd58-48da-bdd8-125b0486ee72` — QA Prueba – Club 18-11 (28 filas ranking)
- `63149867-0451-4ee9-94f7-f9a974f3d5e4` — QA Prueba – Zonas 18-11
- `dcac48e7-b9b0-4ed1-8551-2853f01f60a0` — QA Prueba – Planilla 18-11

## Sede QA

- Club `fb9efe7b-abdf-4fad-9055-657cab7553a7` («QA Prueba – Sede 18-11») + 2 canchas asociadas.

## Marketplace QA

Órdenes pendientes eliminadas (ítems de orden en cascada):

- `5c2c8fc7-67f5-45ef-b82a-857543757304`
- `77ef285a-130b-449b-846c-b78b40e52c46`

## PUB-20

- Añadido `deploy/padelnexus-netlify-legacy/_redirects` (no va en `play`; evita loop en Next).
- **Deploy manual** en el sitio Netlify legacy `padelnexus.netlify.app` si sigue activo (no hay acceso desde este repo al proyecto viejo).

## Verificación post-limpieza

```sql
SELECT EXISTS(SELECT 1 FROM torneos WHERE id IN (...18-11...)) AS torneos_qa,
       EXISTS(SELECT 1 FROM plataforma_fee_movimientos WHERE torneo_id = 'a4d3af99-f3bf-4407-b627-9133f954f5c6') AS fees_club_elim,
       EXISTS(SELECT 1 FROM marketplace_ordenes WHERE id IN (...)) AS ordenes_qa,
       EXISTS(SELECT 1 FROM clubes WHERE id = 'fb9efe7b-abdf-4fad-9055-657cab7553a7') AS club_sede;
-- Resultado esperado: todos false
```