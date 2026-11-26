import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-45 unir fichas de jugador", () => {
  it("utilidad fusiona inscripciones, rankings y retira origen", () => {
    const util = readFileSync(
      path.join(RAIZ, "src/utils/fusionFichasJugador.ts"),
      "utf8",
    );
    assert.match(util, /fusionarFichasJugador/);
    assert.match(util, /inscripciones_movidas/);
    assert.match(util, /rankings_fusionados/);
    assert.match(util, /origen_eliminado/);
  });

  it("servicio y ruta superadmin con auditoría", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(svc, /unirFichasPorSuperadmin/);
    assert.match(svc, /unir_fichas_jugador/);
    assert.match(svc, /fusionarFichasJugador/);

    const routes = readFileSync(
      path.join(RAIZ, "src/routes/perfil.routes.ts"),
      "utf8",
    );
    assert.match(routes, /unir-ficha/);
    assert.match(routes, /unirFichasJugador/);
    assert.match(routes, /authorize\(\["superadmin"\]\)/);
  });

  it("corregir DNI expone otro_perfil en 409", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/perfil.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /otro_perfil/);
    assert.match(ctrl, /statusCode === 409/);
  });
});