# Re-test 24/11 — Progreso de corrección

Plan activo: Re-test 24/11 (PDF Dylan, 24/11/2026).  
Plan en repo: [plan-re-test-24-11-padel-nexus.md](./plan-re-test-24-11-padel-nexus.md).

**Continuación Re-test 25/11:** [plan-re-test-25-11-padel-nexus.md](./plan-re-test-25-11-padel-nexus.md) · [qa-re-test-25-11-progreso.md](./qa-re-test-25-11-progreso.md) (siguiente ítem **MKT-10**).

## Ola 1 — Seguridad y pagos (FEE) — COMPLETADA

Commits: `fdf72f1` (back), `c300712` (front).

| Código | Estado | Tests |
|--------|--------|-------|
| FEE-13 | HECHO | `fee13ReservaPagarMercadoPago.test.ts` |
| FEE-14 | HECHO | `fee14ConfirmarMarketplaceMp.test.ts` |
| FEE-15 | HECHO | `fee15ConfirmarInscripcionMp.test.ts` |
| FEE-16 | HECHO | `fee16CargosServicioSuperadmin.test.ts` |
| FEE-11 | HECHO | `fee11ReporteFinanzasCsv.test.ts` |

## Ola 2 — Torneos (bloqueantes 28/11) — COMPLETADA

Commits:

- `7548e68` (back: TOR-51/4, TOR-52, TOR-49)
- `3c9ccc5` (front: TOR-51/52)
- `6f387fd` (back: TOR-48, TOR-22, TOR-24, CLI-1)
- `8ebac0d` (front: TOR-22, TOR-48, CLI-1)

| Código | Estado | Tests |
|--------|--------|-------|
| TOR-51 / TOR-4 | HECHO | `tor51DiasCompetencia.test.ts`, `diasCompetenciaGeneracion.test.ts`, `tor51CapacidadDias.test.ts` |
| TOR-52 | HECHO | `tor52ZonaCuatroGanadoresPerdedores.test.ts` |
| TOR-49 | HECHO | `tor49ProgramacionPublicada.test.ts` (caso #21 sáb / #24 dom) |
| TOR-48 | HECHO | `tor48LlaveZonaHorarios.test.ts` |
| TOR-22 | HECHO | `tor22ByeMaterializacion.test.ts`, `fapPaseDirectoLlave.test.ts`, `tor22LlaveAltaPareja.test.ts` |
| TOR-24 | HECHO | `tor24GuardarZonas.test.ts`; refuerzo `323df9e` (hojas finalizadas + auditoría zonas) |
| CLI-1 | HECHO | `cli1PlanillaOficial.test.ts`, `cli1ProvinciaPerfil.test.ts` |

### Nota operativa 28/11 (Alta Barda)

Los torneos reales con solo "Sáb 28" marcado deben corregirse guardando el Paso 1 con `fecha_fin` alineada al rango real (o forzar actualización de fechas) para que el backend regenere todos los días del rango; confirmar con Héctor antes de tocar datos productivos.

## Ola 3 — Ranking y sitio público — COMPLETADA (código + tests)

Regresión: `apps/api/test/ola3RankingSitioPublico.test.ts` y `apps/web/test/ola3RankingPublicoValidacion.test.ts`.

| Código | Estado | Tests |
|--------|--------|-------|
| RNK-1 | Hecho | `rankingContextoJugador.test.ts`, `rnk1MisContextosFk.test.ts` |
| RNK-3 | Hecho | `rnk3RankingRama.test.ts`, `rnk3RankingPublicoRama.test.ts` |
| RNK-2 / TOR-53 | Hecho | `rnk2Tor53RankingScopes.test.ts`, `rnk2RankingPublicoScopes.test.ts` |
| PUB-27 | Hecho | `pub27PanelPuestoRanking.test.ts`, `pub27RankingProvincialFiltro.test.ts` |
| PUB-28 | Hecho (código) | `pub28RankingExclusionQa.test.ts`, `datoPrueba.test.ts`; ampliado `323df9e` (DNI 990025/026, sin puntos en torneos prueba) |

**Limpieza Supabase QA (pendiente confirmación de Héctor):** jugadores/torneos `QA Prueba` 18-11 y 24-11, sede `QA Prueba - Sede 18-11`, DNIs 990001xx / 990003xx / 99002401-432. **No ejecutar** sin OK explícito (no tocar torneos Alta Barda).

## Ola 4 — Marketplace y reservas (en curso)

| Código | Estado | Tests |
|--------|--------|-------|
| MKT-2 | HECHO (código heredado 18/11 + regresión 24/11) | `mkt2VentasCobradas.test.ts` (util + tienda pública / producto / CRM) |
| MKT-5 | HECHO | `mkt5MarketplaceMobileLayout.test.ts` |
| MKT-6 | HECHO | `mkt6MarcaProducto.test.ts` |
| MKT-7 | HECHO | `mkt7FacetasCatalogoPublico.test.ts` |
| MKT-8 | HECHO (consulta + reactivación acordada) | `mkt8TiendasSuspendidasInventario.test.ts` + inventario abajo |

### MKT-8 — Inventario Supabase (`marketplace_vendedores` + clubes, 24/11)

**Resumen:** las **8** tiendas registradas están `suspendido`; **ninguna** `activo` → el catálogo público queda vacío salvo QA con tienda suspendida (productos activos no visibles por MKT-7).

| Tienda | Estado tienda | Entidad | Club / Federación | Estado club | Prod. activos |
|--------|---------------|---------|-------------------|-------------|---------------|
| Federación Argentina de Pádel | suspendido | federacion | FAP | — | 1 |
| New Center Store | suspendido | club | New Center | Inactivo | 1 |
| La Plata Padel Market | suspendido | club | LA PLATA PADEL INDOOR | Inactivo | 0 |
| QA Prueba Tienda | suspendido | club | QA Prueba Club | Inactivo | 1 |
| Brujo del Padel / Enzo / Indumentaria Z / Whapy Test | suspendido | — (sin entidad) | — | — | 0–1 legacy |

**Alta Barda (torneos Héctor):**

| Club | Estado club | Tienda marketplace |
|------|-------------|-------------------|
| CLUB ALTA BARDA PADEL | **Activo** | Sin tienda |
| Alta Barda Padel | Inactivo | Sin tienda |

**Club La Plata Padel** (nombre del plan): Inactivo, **sin** fila en `marketplace_vendedores` (la tienda “La Plata” apunta a **LA PLATA PADEL INDOOR**, otro club).

**Acción posible tras confirmación:** `POST /marketplace/admin/vendedores/:id/reactivar` (superadmin) y/o `UPDATE clubes.estado` si el club debe quedar Activo para operar fuera del marketplace.

**Reactivación aplicada (24/11, con OK del equipo):**

- Tienda **Federación Argentina de Pádel** (`ab74d086-…`) → `activo`.
- Entidad FAP ya estaba `activo` en `federaciones`; sin cambio de club.
- Verificación: 1 producto activo visible en catálogo bajo tienda activa con `entidad_id`.

**Pendiente operativo:** 7 tiendas siguen `suspendido` (incl. New Center, La Plata, QA). Alta Barda no tiene tienda registrada.

## Ola 4 — COMPLETADA

## Ola 5 — Pedidos Héctor (post 28/11)

| Código | Estado | Tests |
|--------|--------|-------|
| CLI-4 | HECHO | `cli4ReplicarTorneo.test.ts`, `cli4ReplicarTorneoModal.test.ts` |
| CLI-5 | HECHO | `cli5CategoriasEvento.test.ts`, `cli5SelectorCategoriaEvento.test.ts` |
| CLI-3 | HECHO (código Fase 1+2; QA punto 15 manual post 28/11) | `cli3ProgramadorMaestro.test.ts`, `cli3EventoCategoriaColores.test.ts`, [cli3-programador-maestro.md](./cli3-programador-maestro.md) |

**Siguiente en re-test 24/11:** QA manual **CLI-3** checklist punto 15 con evento real (3+ categorías, 5 canchas) cuando Héctor confirme post bloqueantes 28/11.

## Re-test 25/11 — Fase 1 cerrada en código

Entidades/fichas (**ENT-38**, **ENT-39**, **ENT-40**, **ENT-41**) commiteados en `5401c53`, `219266f`, `8a8d35e`, `c5b70e6`. **ENT-36** pendiente. Detalle completo en [qa-re-test-25-11-progreso.md](./qa-re-test-25-11-progreso.md).