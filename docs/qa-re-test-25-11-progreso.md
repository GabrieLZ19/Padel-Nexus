# Re-test 25/11 — Progreso de corrección

Plan maestro: [plan-re-test-25-11-padel-nexus.md](./plan-re-test-25-11-padel-nexus.md).  
Plan anterior (24/11): [qa-re-test-24-11-progreso.md](./qa-re-test-24-11-progreso.md).

**Siguiente ítem:** **Fase 2C** — MKT-10, RES-22, RNK-4 (post 28/11).

Última actualización de código: commits `b333f00`, `d687202`, `7c90a96` en `main` (26/11/2026).

## Fase 1 — Antes del 28/11

### Bloque 1A — Seguridad y datos personales — COMPLETADO

| Código | Estado | Commits / tests |
|--------|--------|-----------------|
| FEE-18 | HECHO | `8087eab` — `fee17a19SeguridadInscripciones.test.ts` |
| FEE-17 | HECHO | `8087eab` |
| FEE-19 | HECHO | `8087eab`, `f9b6795` (front sin `usuario_id` en body) |
| PUB-29 | HECHO | `8087eab` — `pub29RankingSinPii.test.ts` |

### Bloque 1B — Programador maestro crítico — COMPLETADO

| Código | Estado | Commits / tests |
|--------|--------|-----------------|
| CLI-6 | HECHO | `8087eab` — `cli6a8ProgramadorEvento.test.ts` |
| CLI-7 | HECHO | `8d7836c` (front drop seguro) |
| CLI-8 | HECHO | `533a5f3` — `cli6a8ProgramadorEvento.test.ts` |

### Bloque 1C — Padrón y jugadores — COMPLETADO

| Código | Estado | Commits / tests |
|--------|--------|-----------------|
| ENT-34 | HECHO | `533a5f3` — migración índices/RPC, `ent34y37LicenciasRendimientoBusqueda.test.ts` |
| ENT-37 | HECHO | `533a5f3` — `ent34y37LicenciasRendimientoBusqueda.test.ts` |
| ENT-35 | HECHO | `f302221`, `13d449b` — `ent35ActivacionPadronFap.test.ts` |

### Bloque 1D — Llaves y ranking QA — COMPLETADO (código)

| Código | Estado | Commits / tests |
|--------|--------|-----------------|
| TOR-49 | HECHO | `c143872` — `tor49ProgramacionPublicada.test.ts` |
| TOR-22 | HECHO | `5761b03`, `73e81bd` — tests TOR-22 existentes |
| TOR-24 | HECHO | `6f387fd` base + refuerzo `323df9e` — `tor24GuardarZonas.test.ts` |
| PUB-28 | HECHO (código) | `323df9e` — `pub28RankingExclusionQa.test.ts`, `datoPrueba.test.ts` |

**Operativo PUB-28:** limpieza Supabase QA pendiente confirmación de Héctor (misma lista que re-test 24/11 en `qa-re-test-24-11-progreso.md`). No ejecutar sin OK (no tocar Alta Barda).

## Fase 2 — Post 28/11

### Bloque 2A — Entidades y fichas — PARCIAL

| Código | Estado | Commits / tests |
|--------|--------|-----------------|
| ENT-38 | HECHO | `5401c53` — `ent38a41FichasEntidades.test.ts` |
| ENT-39 | HECHO | `5401c53` — `ent38a41FichasEntidades.test.ts` |
| ENT-40 | HECHO | `219266f`, `8a8d35e` — `ent36y40BajaEntidades.test.ts` |
| ENT-41 | HECHO | `5401c53`, `c5b70e6` — `ent38a41FichasEntidades.test.ts` |
| ENT-36 | PENDIENTE | Baja de clubes: historial sin licencia auto sin pagos + contador canchas |

### Bloque 2B — Programador maestro (mejoras) — COMPLETADO

| Código | Estado | Notas |
|--------|--------|-------|
| CLI-9 | HECHO | Sedes/canchas compartidas — `cli9ProgramadorEventoSedes.test.ts` |
| CLI-10 | HECHO | Descanso con «Por definir» — `cli10ProgramadorEventoDescanso.test.ts` |
| CLI-11 | HECHO | Reparto equilibrado, orden persistente — `cli11ProgramadorEventoOrden.test.ts` |
| CLI-12 / CLI-13 | HECHO | `d687202`, `b333f00` — `cli12ProgramadorEventoCapacidad.test.ts`, `cli12ProgramadorEventoUi.test.ts` |
| CLI-14 / CLI-15 | HECHO | `d687202`, `b333f00` — `cli14ProgramadorEventoListado.test.ts`, `cli15ReplicarPares.test.ts` |
| CLI-1 | HECHO | `b333f00`, `d687202` — `cli1PlanillaOficial.test.ts`, `cli1ProvinciaPerfil.test.ts` |

### Bloque 2C — Marketplace, reservas y ranking club — PENDIENTE

| Código | Estado |
|--------|--------|
| MKT-10 | PENDIENTE |
| RES-22 | PENDIENTE |
| RNK-4 | PENDIENTE |

## Ítems operativos (sin código)

- **DOM-7**: DNS `padelnexus.com.ar` en Vercel.
- **MKT-8 / MKT-9**: Qué tiendas/clubes activar al lanzamiento (ver inventario en `qa-re-test-24-11-progreso.md`).
- **Verificación post 28/11**: `PUB-1`, `PUB-27`, `RNK-1`, `RNK-2`, `FEE-6/7/10/11`.