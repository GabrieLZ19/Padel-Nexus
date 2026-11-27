# Re-test 26/11 — Items RES-23, MKT-12, FEE-21, ENT-46/47/48, ENT-49

## Commits

| Código | Backend | Frontend |
|--------|---------|----------|
| RES-23 | `2e68302` | — |
| MKT-12 | `ca17295` | `01b4903` |
| FEE-21 | `467ef9e` | `b2ce031` |
| ENT-46/47/48, ENT-49 | `e4e0d6c` | — |

## Resumen

- **RES-23:** Índice único parcial en `reservas`; `23505` → 409 en `crearReserva`; test `res23ReservaTrasCancelacion.test.ts`; migración aplicada en Supabase.
- **MKT-12:** `assertVendedoresActivosParaVenta` en orden/checkout/MP; `tienda_suspendida` en producto público; UI bloquea carrito.
- **FEE-21:** `cancelarInscripcion` valida antes de anular fee; jugador `usuario` no baja inscripción pagada; `InscripcionBajaJugador` en `/mi-perfil/torneos`.
- **ENT-46/47/48:** Colisión inscripciones mismo torneo; sync nombres post-fusión; preservar email/auth en destino provisional; excluir archivados en CRM.
- **ENT-49:** Búsqueda CRM por tokens (comas como licencias); test `ent49CrmContactosBusqueda.test.ts`.

## Siguiente

Item 9 del plan maestro: **TOR-22** y **TOR-24**.