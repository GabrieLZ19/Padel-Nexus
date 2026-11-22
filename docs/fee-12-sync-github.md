# FEE-12 — Sincronización con GitHub (verificado, push diferido)

Última verificación: 2026-11-22.

## Estado actual

| Referencia | Commit | Notas |
|----------|--------|--------|
| `main` (local) | `17d82ca` | HEAD |
| `origin/main` | `bea3c00` | **7 commits detrás** de local |
| `whapy/main` | `5e0ddf9` | **Muy detrás** (incluye lote 17/11 + re-test 18/11) |

Rama de trabajo: `main` (tracking `origin/main`).

## Commits ya listos para push (sin cambios pendientes de commit en el lote)

Publicar en `origin` cuando cierre el plan:

1. `7b592a2` — fix(back): puntos por instancia, ranking provincial y validacion MP en licencias  
2. `eb20d70` — feat(back): fees re-test 18/11 (org, permisos, anulación y plazas MP)  
3. `65783cb` — feat(front): cargos servicio club y cobro inscripción por jugador/plaza  
4. `d7c17e6` — docs: progreso re-test 18/11 (lote FEE-1 a FEE-9)  
5. `fcbb060` — feat(back): desglose fee en checkout MP y materialización pase directo FAP  
6. `95ca06f` — feat(front): desglose fee en checkout, menú Finanzas y alta en pase directo  
7. docs: progreso re-test 18/11 (FEE-10, FEE-4, FEE-12, TOR-22/28) — ver `git rev-parse --short HEAD`  

## Checklist al terminar el plan completo

1. `git status` limpio (solo archivos del producto; no subir `.docx` / `_tmp-*` de `docs/` si son personales).
2. Commits back/front/docs para ítems restantes del plan (p. ej. TOR-50).
3. `pnpm test` en `apps/api` (mínimo tests del slice) y smoke build si hubo cambios grandes.
4. Push a GitHub personal / deploy:

   ```bash
   git fetch origin
   git push origin main
   ```

5. Si el remoto de equipo sigue en uso (`whapy`):

   ```bash
   git fetch whapy
   git push whapy main
   ```

   `whapy/main` hoy está en `5e0ddf9`; el push actualizará todo el histórico desde el 17/11 + re-test. **No usar `--force`** salvo acuerdo explícito del equipo.

6. Confirmar en GitHub que `origin/main` y (si aplica) `whapy/main` apuntan al mismo HEAD local tras el cierre del plan.

## Qué NO hacer hasta el cierre

- No pushear commits a medias si faltan ítems del plan con código local sin commitear.
- No mezclar secrets (`.env`) en commits.

## Relación con el informe original

El PDF citaba remoto en `5e0ddf9` vs local `fb99457..bea3c00`: en `origin` eso ya está resuelto hasta `bea3c00`; el desfase actual son los **7 commits** anteriores. En `whapy` el desfase sigue siendo el del informe + esos 7 commits.