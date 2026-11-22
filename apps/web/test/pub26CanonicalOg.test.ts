import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-26 canonical por ruta y OG PNG", () => {
  it("siteMetadata usa og-image.png y no canonical fijo en root", () => {
    const util = readFileSync(path.join(RAIZ, "utils/siteMetadata.ts"), "utf8");
    assert.match(util, /\/brand\/og-image\.png/);
    assert.doesNotMatch(util, /LogoHorizontal\.svg/);
    assert.doesNotMatch(util, /canonical:\s*"\//);
    assert.match(util, /OG_IMAGE_WIDTH\s*=\s*1200/);
    assert.match(util, /OG_IMAGE_HEIGHT\s*=\s*630/);
    const og = statSync(path.join(RAIZ, "public/brand/og-image.png"));
    assert.ok(og.size > 10_000, "og-image.png debe existir");
  });

  it("rutas publicas del re-test declaran path canónico", () => {
    for (const [rel, segment] of [
      ["(public)/page.tsx", 'path: "/"'],
      ["(public)/torneos/layout.tsx", 'path: "/torneos"'],
      ["(public)/ranking/layout.tsx", 'path: "/ranking"'],
      ["(public)/reservar/layout.tsx", 'path: "/reservar"'],
      ["(public)/marketplace/layout.tsx", 'path: "/marketplace"'],
      ["(public)/partidos/layout.tsx", 'path: "/partidos"'],
      ["(auth)/login/layout.tsx", 'path: "/login"'],
      ["(auth)/signup/layout.tsx", 'path: "/signup"'],
      ["(public)/privacidad-menores/layout.tsx", 'path: "/privacidad-menores"'],
    ] as const) {
      const file = readFileSync(path.join(RAIZ, "app", rel), "utf8");
      assert.ok(file.includes(segment), `${rel} debe incluir ${segment}`);
    }
    const torneoId = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/[id]/layout.tsx"),
      "utf8",
    );
    assert.match(torneoId, /generateMetadata/);
    assert.match(torneoId, /path:\s*`\/torneos\/\$\{id\}`/);
  });

  it("privacidad menores tiene titulo propio", () => {
    const file = readFileSync(
      path.join(RAIZ, "app/(public)/privacidad-menores/layout.tsx"),
      "utf8",
    );
    assert.match(file, /Privacidad de menores/);
  });
});