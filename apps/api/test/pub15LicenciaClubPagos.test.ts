import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-15 pagos de licencia de club para admin_club", () => {
  it("GET pagos permite admin_club y valida club propio en el controlador", () => {
    const rutas = readFileSync(
      path.join(RAIZ, "src/routes/club.routes.ts"),
      "utf8",
    );
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/licenciaClub.controller.ts"),
      "utf8",
    );

    const idx = rutas.indexOf('"/:id/licencia/:licenciaId/pagos"');
    assert.ok(idx > 0);
    const pagosRoute = rutas.slice(idx, idx + 320);
    assert.match(pagosRoute, /admin_club/);
    assert.match(ctrl, /validarLecturaLicenciaClub/);
    assert.match(ctrl, /licenciaPerteneceAClub/);
    assert.match(ctrl, /No podés ver la licencia de otro club/);
  });
});
