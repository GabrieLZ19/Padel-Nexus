import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-12 títulos por página", () => {
  it("layout raíz usa plantilla de título", () => {
    const layout = readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");
    const meta = readFileSync(
      path.join(RAIZ, "utils/siteMetadata.ts"),
      "utf8",
    );
    assert.match(layout, /rootMetadata\(\)/);
    assert.match(meta, /template: `%s · \$\{SITE_NAME\}`/);
  });

  it("rutas públicas QA tienen metadata de segmento", () => {
    for (const segment of [
      "torneos",
      "ranking",
      "reservar",
      "marketplace",
      "partidos",
    ]) {
      const file = readFileSync(
        path.join(RAIZ, `app/(public)/${segment}/layout.tsx`),
        "utf8",
      );
      assert.match(file, /pageMetadata/);
      assert.match(file, /export const metadata/);
    }
  });

  it("portada e login exportan metadata", () => {
    const home = readFileSync(path.join(RAIZ, "app/(public)/page.tsx"), "utf8");
    const login = readFileSync(
      path.join(RAIZ, "app/(auth)/login/layout.tsx"),
      "utf8",
    );
    assert.match(home, /title: "Inicio"/);
    assert.match(login, /Iniciar sesión/);
  });

  it("signup y 404 usan pageMetadata descriptivo", () => {
    const signup = readFileSync(
      path.join(RAIZ, "app/(auth)/signup/layout.tsx"),
      "utf8",
    );
    assert.match(signup, /pageMetadata/);
    assert.match(signup, /Crear cuenta/);

    for (const rel of [
      "app/not-found.tsx",
      "app/(public)/not-found.tsx",
      "app/dashboard/not-found.tsx",
      "app/club/not-found.tsx",
    ]) {
      const file = readFileSync(path.join(RAIZ, rel), "utf8");
      assert.match(file, /pageMetadata/);
      assert.match(file, /Página no encontrada/);
      assert.doesNotMatch(file, /\| Padel Nexus/);
    }
  });
});
