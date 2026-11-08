import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-12 títulos por página", () => {
  it("layout raíz usa plantilla de título", () => {
    const layout = readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");
    assert.match(layout, /template: "%s · Padel Nexus"/);
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
});
