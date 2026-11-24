# Re-test 24/11 — Progreso de corrección

Plan activo: Re-test 24/11 (PDF Dylan, 24/11/2026).  
Plan en repo: [plan-re-test-24-11-padel-nexus.md](./plan-re-test-24-11-padel-nexus.md).

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
| TOR-24 | HECHO | `tor24GuardarZonas.test.ts` |
| CLI-1 | HECHO | `cli1PlanillaOficial.test.ts`, `cli1ProvinciaPerfil.test.ts` |

### Nota operativa 28/11 (Alta Barda)

Los torneos reales con solo "Sáb 28" marcado deben corregirse guardando el Paso 1 con `fecha_fin` alineada al rango real (o forzar actualización de fechas) para que el backend regenere todos los días del rango; confirmar con Héctor antes de tocar datos productivos.

## Ola 3 — Ranking y sitio público — PENDIENTE (siguiente)

Orden sugerido del plan: **RNK-1**, **RNK-3**, **RNK-2 / TOR-53**, **PUB-27**, **PUB-28**.

| Código | Estado | Tests |
|--------|--------|-------|
| RNK-1 | Pendiente | `rankingContextoJugador.test.ts` |
| RNK-3 | Pendiente | — |
| RNK-2 / TOR-53 | Pendiente | — |
| PUB-27 | Pendiente | — |
| PUB-28 | Pendiente | + limpieza QA Supabase (con confirmación) |

**Siguiente en re-test 24/11:** Ola 3, ítem **RNK-1**.