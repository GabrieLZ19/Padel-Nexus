import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-22 alta de pareja en edición de llave", () => {
  it("expone búsqueda y alta con auditoría sin bloquear por estado del torneo", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/llaveAltaPareja.service.ts"),
      "utf8",
    );
    assert.match(svc, /ALTA_PAREJA_EDICION_LLAVE/);
    assert.match(svc, /buscarParejasExternas/);
    assert.match(svc, /excluidas_en_torneo/);
    assert.match(svc, /ejecutarAltaDesdePayload/);
    assert.match(svc, /importarParejaDesdeOtroTorneo/);
    assert.match(svc, /bloqueada_en_torneo/);
    assert.match(svc, /categoriaTorneo/);
    assert.doesNotMatch(svc, /assertPasoJugadoresEditable/);

    const routes = readFileSync(
      path.join(RAIZ, "src/routes/torneo.routes.ts"),
      "utf8",
    );
    assert.match(routes, /llave\/buscar-parejas/);
    assert.match(routes, /llave\/alta-pareja/);
    assert.match(routes, /admin_club/);

    const torneoSvc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(torneoSvc, /ejecutarAltaDesdePayload/);
    assert.match(torneoSvc, /altaLadoA/);

    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /alta_lado_a/);
  });
});
