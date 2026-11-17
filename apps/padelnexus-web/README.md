# Sitio estatico www (presentacion)

Carpeta **independiente** de `apps/web` (Next.js). No comparte build ni deploy con la plataforma en `play.padelnexus.app`.

## Vercel (proyecto 2 en el mismo repo)

Crear un **segundo proyecto** en Vercel apuntando al **mismo repositorio** que `padel-nexus`:

| Campo | Valor |
|--------|--------|
| Nombre sugerido | `padelnexusapp` (o el que use Hector) |
| Root Directory | `apps/padelnexus-web` |
| Framework Preset | **Other** |
| Build Command | vacio (sin build) |
| Output Directory | `.` (raiz del root directory) |
| Install Command | vacio |

`vercel.json` en esta carpeta define headers y redirecciones de rutas de plataforma hacia `https://play.padelnexus.app`.

### Dominios (proyecto www / estatico)

1. `www.padelnexus.app` -> Production de este proyecto.
2. `padelnexus.app` -> redirect a `https://www.padelnexus.app` (301/308 en Vercel Domains).
3. `padelnexus.com.ar` -> redirect a `https://www.padelnexus.app` (luego nameservers de Vercel en NIC.ar).

### Dominios (proyecto Next `apps/web` — sin cambiar)

- `play.padelnexus.app` -> Production.
- `app.padelnexus.app` -> redirect a `play.padelnexus.app` (misma ruta).

## Orden de corte (punto 3 del brief)

1. Verificar `play` estable (API Render, env, Supabase, MP).
2. Deploy preview del estatico y asignar `www` **sin** quitar el apex hasta validar.
3. Pasar `padelnexus.app` a redirect a `www`.
4. Sumar `.com.ar` y entregar nameservers a Hector.

## No afecta el deploy de la plataforma

Vercel despliega **un root directory por proyecto**. Mientras `padel-nexus` siga con Root `apps/web`, los commits que toquen solo `apps/padelnexus-web` pueden disparar el proyecto www si esta conectado al repo; el proyecto play solo rebuilda si cambia su root o dependencias compartidas en el monorepo (segun Ignored Build Step). Opcional: en el proyecto play, **Ignored Build Step** = solo construir si hay cambios bajo `apps/web` (script en docs).