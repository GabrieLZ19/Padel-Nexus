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
  });
});
