# Plan de Corrección Re-test Final 13/11 — Padel Nexus

Copia en repo del plan de corrección (sincronizado tras cada lote). Los lotes 1–7 están cerrados en código; **siguiente trabajo: Lote 8**.

Seguimiento detallado: [qa-re-test-13-11-progreso.md](qa-re-test-13-11-progreso.md).

## Estado por lote

| Lote | Tickets | Estado |
|------|---------|--------|
| 1 | PUB-19, PUB-18, PUB-15 | COMPLETADO |
| 2 | ENT-26, ENT-21, ENT-27, ENT-29 | COMPLETADO |
| 3 | TOR-5, TOR-32, TOR-35, TOR-6 | COMPLETADO |
| 4 | TOR-28, TOR-24, TOR-23, TOR-22, TOR-21, TOR-36, TOR-16 | COMPLETADO |
| 5 | TOR-4, TOR-27, TOR-33, TOR-34 | COMPLETADO |
| 6 | CLI-2, CLI-1 | COMPLETADO |
| 7 | ENZO-1, ENZO-3, ENT-25, ENT-28, ENT-30, RES-17, RES-18, RES-19 (+ RES-15) | COMPLETADO (`dc97a9f`, `73bb116`) |
| 8 | PUB-22, PUB-20, PUB-21, PUB-16, App 1.0.0 | **SIGUIENTE** |

## Lote 8 · Cookies HttpOnly BFF, Redirecciones Netlify, SEO, Ranking Legacy y Mobile

- **PUB-22 (Next.js BFF):** Route Handlers `apps/web/app/api/auth/session/route.ts` y `apps/web/app/api/proxy/[...path]/route.ts`; cookie `HttpOnly`; actualizar cliente API, login/callback y `useSocket`.
- **PUB-20:** redirect 301 en `apps/web/netlify.toml` hacia `www.padelnexus.app`.
- **PUB-21:** Open Graph, `robots.ts`, `sitemap.ts`, favicon, títulos en rutas públicas clave.
- **PUB-16:** migración SQL para corregir `ronda` en `historial_ranking` (backfill erróneo).
- **App 1.0.0:** variables EAS en `apps/mobile/eas.json` / `.env.example`.

## Criterio de cierre por lote

1. Verificación en código + Supabase cuando aplique.
2. Tests en `apps/api` y `apps/web` para el bug.
3. Lint/build del slice tocado.

Texto completo del plan original (lotes 1–7 con causas raíz): ver historial de commits o el archivo de plan en Cursor `re-test_13-11_correction_plan`.
