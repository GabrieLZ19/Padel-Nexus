import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-6 checkout servicio sin envío", () => {
  it("carritoRequiereEnvio solo con productos físicos", () => {
    const util = readFileSync(
      path.join(RAIZ, "utils/marketplace/checkoutEnvio.ts"),
      "utf8",
    );
    assert.match(util, /item\.tipo === "producto"/);
  });

  it("oculta fila Envío y dirección en carrito y checkout", () => {
    const cart = readFileSync(
      path.join(RAIZ, "components/marketplace/CartDrawer.tsx"),
      "utf8",
    );
    const checkout = readFileSync(
      path.join(RAIZ, "app/(public)/marketplace/checkout/page.tsx"),
      "utf8",
    );
    assert.match(cart, /requiereEnvio/);
    assert.match(checkout, /carritoRequiereEnvio/);
    assert.match(checkout, /Datos de contacto/);
    assert.match(checkout, /requiereEnvio &&/);
  });
});
