# CLI-3 — Programador Maestro (Héctor, nov 2026)

Documento fuente: *PADEL NEXUS Programador Maestro.docx*.

**CLI-4** y **CLI-5** no cambian. **CLI-3** reemplaza el ítem previo del plan re-test (grilla multi-categoría simple).

## Orden operativo

- Después de bloqueantes **28/11** (FEE-13/14, TOR-52, PUB-28). El torneo de Héctor del 28/11 puede programarse a mano por categoría hasta cerrar Fase 1.
- **Fase 1 + Fase 2** de este documento en código.
- **Fase 3** (multisedes avanzadas, traslados, contingencias) explícitamente fuera de alcance inicial.

## Entidad evento (existente)

- Tabla `grupos_torneo` + `torneos.grupo_id`.
- UI **Sumar torneos** / replicar (CLI-4) vincula categorías.
- No duplicar partidos: la fuente deportiva sigue siendo cada torneo; el maestro solo agenda sede/cancha/horario.

## Principio técnico

- **Una asignación por partido** (`partidos.cancha_asignada`, `fecha_partido`).
- Programador por torneo y Programador Maestro escriben el mismo registro.
- Validación en servidor con **intervalo completo** del partido + ocupación de otras categorías del evento + **reservas confirmadas** de la cancha cuando se puede resolver `cancha_id`.

## Fase 1 — Prioritaria (cierre con punto 15)

| Req. doc | Implementación |
|----------|----------------|
| Evento + competencias asociadas | `grupo_id`, listado en board del evento |
| Agenda compartida de canchas | Unión de `canchas_disponibilidad_torneo` de categorías + grilla única |
| Partidos automáticos | Lectura de `partidos` por torneo del grupo |
| Grilla única | `GET /torneos/grupos/:grupoId/programacion/board` |
| Asignación manual DnD | Reusa `ProgramadorVisualPage` en modo evento |
| Sin superposición de cancha | `validarSolapesAgendaCompartida` + issues cruzados |
| Sincronía con programador individual | Misma tabla; `ProgramacionService.asignar` valida evento si hay `grupo_id` |
| Publicación | Por categoría: `POST .../publicar` (todas o una) reutilizando `ProgramacionService.publicar` |

### Criterios de aceptación (punto 15)

Checklist QA manual / tests de escenario:

1. Evento con **3+ torneos** agrupados.
2. Partidos de zona y llave visibles sin carga manual.
3. **5 canchas** con disponibilidades distintas por sede/config.
4. Vista simultánea de todas las categorías (color + filtro).
5. Imposible dos partidos en la misma cancha con intervalos que se pisan.
6. Reprogramar una categoría no borra horarios de las otras.
7. Cambio en maestro se ve en detalle del torneo (y viceversa).
8. Publicar horarios por categoría.
9. Admin deportivo del torneo sigue independiente (zonas, llave, resultados).

## Fase 2 — Automatización (misma entrega CLI-3)

| Req. doc | Implementación |
|----------|----------------|
| Auto-programación multi-categoría | `POST .../auto` con `ocupados` globales y orden por categoría/prioridad |
| Descansos | Hereda `descanso_modo` por torneo; validación cruzada de jugador |
| Prioridad de categorías | Parámetro `orden_torneo_ids` / prioridad en payload auto |
| Restricciones por pareja | Reusa `evaluateProgramacionIssues` por torneo + solapes globales |
| Dependencias de llave | `validarAsignacionHorarioPartido` por torneo (sin mezclar feeders entre categorías) |
| Optimización de canchas | Existente en `asignarHorariosAPartidos`; seed con ocupación del evento |

## Fase 3 — Fuera de alcance (posterior)

Asignación por sede de categoría, traslados, contingencias asistidas, reglas nacionales multisede (secciones 11–12 del doc).

## Rutas API (convención)

Prefijo: `/torneos/grupos/:grupoId/programacion/`

- `GET board` — grilla maestro
- `PUT asignar` / `desasignar` / `POST limpiar`
- `POST auto` — auto multi-categoría
- `POST publicar` — body opcional `{ torneo_ids?: string[] }`
- `GET resumen` — metadatos evento + categorías (ligero)

## Frontend

- Ruta CRM: `/dashboard/eventos/[grupoId]/programacion`
- Ruta club: `/club/eventos/[grupoId]/programacion`
- Acceso desde fila de evento agrupado en listado de torneos.
- Servicio: `ProgramacionEventoService` en `apps/web/utils/services/`.