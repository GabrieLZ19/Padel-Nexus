import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Enzo marketplace público (web)", () => {
  it("home marketplace: grilla de tiendas y sponsors home/banner", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/marketplace/page.tsx"),
      "utf8",
    );
    assert.match(page, /getTiendasPublicas/);
    assert.match(page, /\/marketplace\/tienda\//);
    assert.match(page, /MarketplaceSponsorSlot espacio="banner"/);
    assert.match(page, /MarketplaceSponsorSlot espacio="home"/);
    assert.match(page, /prod\.vendedor\.nombre_tienda/);
  });

  it("servicio front: tiendas y campañas públicas", () => {
    const svc = readFileSync(
      path.join(RAIZ, "utils/services/marketplace.ts"),
      "utf8",
    );
    assert.match(svc, /getTiendasPublicas/);
    assert.match(svc, /getCampanasSponsorPublicas/);
    assert.match(svc, /adminSetTiendaDestacada/);
    assert.match(svc, /\/marketplace\/sponsor-campanas\/publicas/);
  });

  it("perfil tienda y checkout montan sponsor slot", () => {
    const tienda = readFileSync(
      path.join(RAIZ, "app/(public)/marketplace/tienda/[id]/page.tsx"),
      "utf8",
    );
  const checkout = readFileSync(
      path.join(RAIZ, "app/(public)/marketplace/checkout/page.tsx"),
      "utf8",
    );
    assert.match(tienda, /MarketplaceSponsorSlot espacio="tienda"/);
    assert.match(checkout, /MarketplaceSponsorSlot espacio="checkout"/);
  });

  it("moderación superadmin: toggle tienda destacada", () => {
    const panel = readFileSync(
      path.join(RAIZ, "components/marketplace/MarketplaceCrmPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /adminSetTiendaDestacada/);
    assert.match(panel, /puedeDestacar=\{profile\?\.rol === "superadmin"\}/);
  });
});