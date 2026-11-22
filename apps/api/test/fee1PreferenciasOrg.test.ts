import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-1 / RES-21 preferencias-org por organización", () => {
  it("GET y PUT preferencias-org incluyen admin_club", () => {
    const routes = readFileSync(
      `${root}src/routes/platformFee.routes.ts`,
      "utf8",
    );
    const getBlock = routes.match(
      /router\.get\(\s*"\/?preferencias-org"[\s\S]*?\);/,
    )?.[0];
    assert.ok(getBlock, "Debe existir GET preferencias-org");
    assert.match(getBlock!, /admin_club/);

    const putBlock = routes.match(
      /router\.put\(\s*"\/?preferencias-org"[\s\S]*?\);/,
    )?.[0];
    assert.ok(putBlock, "Debe existir PUT preferencias-org");
    assert.match(putBlock!, /admin_club/);
  });

  it("resolver usa AlcanceCuenta y provincia para admin_provincial", () => {
    const util = readFileSync(
      `${root}src/utils/platformFeeOrgUsuario.ts`,
      "utf8",
    );
    assert.match(util, /AlcanceCuentaService\.resolver/);
    assert.match(util, /admin_club.*clubId/s);
    assert.match(util, /admin_provincial.*asociacionIdPorProvincia/s);
    assert.match(util, /mismaProvincia/);
  });

  it("controlador delega org al resolver compartido", () => {
    const ctrl = readFileSync(
      `${root}src/controllers/platformFee.controller.ts`,
      "utf8",
    );
    assert.match(ctrl, /resolverOrgFeeDesdeUsuario/);
  });
});