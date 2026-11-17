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

## Ignored Build Step (opcional, proyecto play)

En Vercel proyecto Next, Settings -> Git -> Ignored Build Step:

```bash
git diff HEAD^ HEAD --quiet -- apps/web packages/
```

Si solo cambia `apps/padelnexus-web`, el deploy de play no corre.