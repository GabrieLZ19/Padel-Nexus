import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MKT-10 banner tienda suspendida en CRM", () => {
  it("muestra banner y bloquea creación de publicaciones", () => {
    const panel = readFileSync(
      path.join(WEB_ROOT, "components/marketplace/MarketplaceCrmPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /MarketplaceTiendaSuspendidaBanner/);
    assert.match(panel, /tiendaSuspendida/);
    assert.match(panel, /gestionBloqueada=\{tiendaSuspendida\}/);
    assert.match(panel, /showProductForm && entidadRef && !tiendaSuspendida/);
  });

  it("expone motivo de suspensión en el tipo Vendedor", () => {
    const svc = readFileSync(
      path.join(WEB_ROOT, "utils/services/marketplace.ts"),
      "utf8",
    );
    assert.match(svc, /motivo_suspension/);
    assert.match(svc, /suspendido_desde/);
  });
});