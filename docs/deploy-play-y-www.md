# Deploy: play vs www

## Arquitectura

```text
play.padelnexus.app     -> Vercel proyecto "padel-nexus" (apps/web, Next.js)
www.padelnexus.app      -> Vercel proyecto "padelnexusapp" (apps/padelnexus-web, estatico)
padelnexus.app          -> redirect -> www
app.padelnexus.app      -> redirect -> play (misma path)
padelnexus.com.ar       -> redirect -> www (dominio en Vercel + NS en NIC.ar)
```

Backend API: Render (`BACKEND_URL`). Variables criticas con dominio play:

- Render: `FRONTEND_URL=https://play.padelnexus.app`, `RECUPERACION_PASSWORD_REDIRECT_URL`, `CORS_EXTRA_ORIGINS` si aplica.
- Supabase Auth: Site URL y Redirect URLs con `https://play.padelnexus.app/**`.
- Mercado Pago: back_urls via `FRONTEND_URL` en API.
- Mobile: URL publica de la app apuntando a play.

## Nameservers Vercel (para NIC.ar)

En Vercel -> Domains -> `padelnexus.com.ar` -> usar los NS que muestre el panel (suelen ser `ns1.vercel-dns.com` y `ns2.vercel-dns.com`; confirmar en UI al agregar el dominio).

## Ignored Build Step (monorepo)

En Vercel, **salida 0 del script = se cancela el deploy**; **salida 1 = se construye**.

Los proyectos tienen **Root Directory** (`apps/web` o `apps/padelnexus-web`), pero el script corre **desde esa carpeta**, no desde la raiz del repo. Un `git diff ... -- apps/web` escrito mal suele marcar *siempre* “sin cambios” y **nunca despliega**.

Scripts en repo (recomendado: pegar el contenido o invocarlos):

| Proyecto | Archivo |
|----------|---------|
| play (`padel-nexus`) | [`deploy/vercel/ignored-build-play.sh`](../deploy/vercel/ignored-build-play.sh) |
| www (`padelnexusapp` / `padel-nexus-padelnexus-web`) | [`deploy/vercel/ignored-build-www.sh`](../deploy/vercel/ignored-build-www.sh) |

**Pegar en Vercel** (Settings -> Build and Deployment -> Ignored Build Step -> Command):

```bash
bash "$(git rev-parse --show-toplevel)/deploy/vercel/ignored-build-play.sh"
```

www:

```bash
bash "$(git rev-parse --show-toplevel)/deploy/vercel/ignored-build-www.sh"
```

Requiere **Include files outside the root directory** = On (ya lo tienen).

### Evitar doble filtro

Si el deploy no aparece o siempre dice *Skipped*:

1. Dejar **solo uno**: o el script de arriba, **o** el toggle *“Skip deployments when there are no changes to the root directory…”* — no ambos a la vez (recomendado: script + toggle **Off**).
2. Commits que solo tocan `apps/api` **no** disparan Vercel (correcto); Render si.
3. El commit `859c25d` solo toca `apps/web` -> debe construir **play**. El www solo reconstruye si cambia `apps/padelnexus-web` (ultimo lote: `37e5340`).

### Forzar deploy ahora

Vercel -> Deployments -> **Redeploy** en el commit deseado (play: `859c25d` o `HEAD`; www: `37e5340` si quieren DOM-5 en www).