import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-5 promociones marketplace UI", () => {
  it("oculta 'Toda la plataforma' salvo tienda federación", () => {
    const tab = readFileSync(
      path.join(RAIZ, "components/marketplace/MarketplacePromocionesTab.tsx"),
      "utf8",
    );
    assert.match(tab, /puedeAudienciaPlataforma/);
    assert.match(tab, /filter\(\(a\) => a\.id !== "plataforma"\)/);
  });

  it("CRM acota audiencia plataforma al tipo federacion", () => {
    const panel = readFileSync(
      path.join(RAIZ, "components/marketplace/MarketplaceCrmPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /puedePromoPlataforma = entidadTipo === "federacion"/);
    assert.match(panel, /puedeAudienciaPlataforma=\{puedePromoPlataforma\}/);
  });
});
