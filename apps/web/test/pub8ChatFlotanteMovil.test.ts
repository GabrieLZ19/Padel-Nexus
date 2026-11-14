import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-8 chat flotante en móvil", () => {
  it("layout público reserva margen inferior para la burbuja (ENZO-3: sin franja lateral)", () => {
    const layout = readFileSync(
      path.join(RAIZ, "app/(public)/layout.tsx"),
      "utf8",
    );
    const css = readFileSync(path.join(RAIZ, "app/globals.css"), "utf8");
    assert.match(layout, /public-content-soporte-fab-safe/);
    assert.match(css, /--soporte-fab-clearance-bottom/);
    assert.doesNotMatch(css, /--soporte-fab-clearance-right/);
    const bloqueFabSafe = css.match(
      /\.public-content-soporte-fab-safe\s*\{[^}]+\}/,
    );
    assert.ok(bloqueFabSafe, "debe existir .public-content-soporte-fab-safe");
    assert.doesNotMatch(bloqueFabSafe![0], /padding-right/);
  });

  it("SoporteChat ancla con safe area y modo compacto al scroll", () => {
    const chat = readFileSync(
      path.join(RAIZ, "components/soporte/SoporteChat.tsx"),
      "utf8",
    );
    assert.match(chat, /soporte-fab-anchor/);
    assert.match(chat, /fabCompacto/);
    assert.match(chat, /soporte-fab-anchor--compact/);
  });
});
