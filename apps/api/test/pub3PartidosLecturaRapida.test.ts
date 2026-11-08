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
  });

  it("obtenerPartidosFormateados solo sincroniza si sincronizarLlave es true", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const idx = svc.indexOf("static async obtenerPartidosFormateados");
    assert.ok(idx > 0);
    const bloque = svc.slice(idx, idx + 900);
    assert.match(bloque, /opciones\?: \{ sincronizarLlave\?: boolean \}/);
    assert.match(
      bloque,
      /if \(opciones\?\.sincronizarLlave\) \{[\s\S]*sincronizarClasificadosALlave/,
    );
    assert.match(bloque, /Promise\.all\(\[/);
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
