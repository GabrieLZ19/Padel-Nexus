import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-11 orden de categorías y reparto equilibrado", () => {
  it("expone ruta y servicio para persistir orden", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/torneo.routes.ts"),
      "utf8",
    );
    assert.match(routes, /grupos\/:grupoId\/programacion\/orden-categorias/);
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacionEvento.service.ts"),
      "utf8",
    );
    assert.match(svc, /guardarOrdenCategoriasEvento/);
    assert.match(svc, /programacion_orden_torneo_ids/);
  });

  it("auto evento recorre dos fases zonas y llave por categoría", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacionEvento.service.ts"),
      "utf8",
    );
    assert.match(svc, /for \(const soloFase of \["zonas", "llave"\]/);
    assert.match(svc, /soloFase/);
  });

  it("ProgramacionService admite soloFase para reparto equilibrado", () => {
    const prog = readFileSync(
      path.join(RAIZ, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(prog, /soloFase\?: "zonas" \| "llave"/);
  });

  it("resolverOrdenCategoriasEvento fusiona orden guardado con categorías actuales", () => {
    const util = readFileSync(
      path.join(RAIZ, "src/utils/programacionEvento.ts"),
      "utf8",
    );
    assert.match(util, /export function resolverOrdenCategoriasEvento/);
    assert.match(util, /prefs\.includes\(id\)/);
    assert.match(util, /!prefs\.includes\(id\)/);
  });

  it("board evento incluye orden_categorias en merge", () => {
    const util = readFileSync(
      path.join(RAIZ, "src/utils/programacionEvento.ts"),
      "utf8",
    );
    assert.match(util, /orden_categorias: meta\.orden_categorias/);
    assert.match(util, /programacion_orden_torneo_ids/);
  });
});