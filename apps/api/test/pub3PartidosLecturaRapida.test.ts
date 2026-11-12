import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-3 lectura de partidos sin sincronizar en público", () => {
  it("sincronizar llave es opt-in por rol/query, no default en lectura", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /sincronizarLlaveEnLecturaPartidos/);
    assert.match(ctrl, /sincronizarLlave: sincronizarLlaveEnLecturaPartidos/);
    assert.match(ctrl, /esRolAccesoCrm/);
    const fnStart = ctrl.indexOf("function sincronizarLlaveEnLecturaPartidos");
    assert.ok(fnStart > 0);
    const fnBlock = ctrl.slice(fnStart, fnStart + 480);
    assert.match(fnBlock, /if \(!forzar\) return false/);
  });

  it("obtenerPartidosFormateados solo sincroniza si sincronizarLlave es true", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const idx = svc.indexOf("static async obtenerPartidosFormateados");
    assert.ok(idx > 0);
    const bloque = svc.slice(idx, idx + 2200);
    assert.match(bloque, /opciones\?: \{ sincronizarLlave\?: boolean \}/);
    assert.match(
      bloque,
      /if \(opciones\?\.sincronizarLlave\) \{[\s\S]*sincronizarClasificadosALlave/,
    );
    assert.match(bloque, /inscripcionIds/);
    assert.match(bloque, /\.in\("id", chunk\)/);
  });

  it("GET partidos usa optionalAuthenticate para resolver rol sin exigir sesión", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/torneo.routes.ts"),
      "utf8",
    );
    assert.match(
      routes,
      /router\.get\("\/:id\/partidos", optionalAuthenticate, getPartidosByTorneo\)/,
    );
  });
});
