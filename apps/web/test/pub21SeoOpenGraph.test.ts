import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-21 SEO Open Graph y sitemap", () => {
  it("siteMetadata expone Open Graph, Twitter y URL canónica", () => {
    const util = readFileSync(
      path.join(RAIZ, "utils/siteMetadata.ts"),
      "utf8",
    );
    const layout = readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");
    assert.match(util, /openGraph/);
    assert.match(util, /twitter/);
    assert.match(util, /metadataBase/);
    assert.match(util, /rootMetadata/);
    assert.match(layout, /rootMetadata\(\)/);
  });

  it("robots y sitemap registrados en App Router", () => {
    const robots = readFileSync(path.join(RAIZ, "app/robots.ts"), "utf8");
    const sitemap = readFileSync(path.join(RAIZ, "app/sitemap.ts"), "utf8");
    assert.match(robots, /sitemap\.xml/);
    assert.match(robots, /disallow/);
    assert.match(sitemap, /RUTAS_PUBLICAS/);
    assert.match(sitemap, /getSiteUrl/);
  });

  it("rutas QA con layout de titulo propio", () => {
    for (const rel of [
      "(auth)/forgot-password/layout.tsx",
      "(auth)/update-password/layout.tsx",
      "(public)/verificar/[usuarioId]/layout.tsx",
      "(public)/jugadores/[id]/layout.tsx",
    ]) {
      const file = readFileSync(path.join(RAIZ, "app", rel), "utf8");
      assert.match(file, /pageMetadata/);
      assert.match(file, /export const metadata|generateMetadata/);
    }
    const forgot = readFileSync(
      path.join(RAIZ, "app/(auth)/forgot-password/layout.tsx"),
      "utf8",
    );
    const jugadores = readFileSync(
      path.join(RAIZ, "app/(public)/jugadores/[id]/layout.tsx"),
      "utf8",
    );
    assert.match(forgot, /Recuperar contraseña/);
    assert.match(jugadores, /generateMetadata/);
    assert.match(jugadores, /perfil\/publico/);
  });

  it("icono de app declarado", () => {
    const icon = readFileSync(path.join(RAIZ, "app/icon.svg"), "utf8");
    assert.match(icon, /viewBox/);
    const meta = readFileSync(
      path.join(RAIZ, "utils/siteMetadata.ts"),
      "utf8",
    );
    assert.match(meta, /LogoAccessory/);
  });
});
