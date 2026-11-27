import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { decidirAlcanceTorneo } from "../src/utils/alcanceCuenta.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-30 alcance en GET /torneos/:id/inscripciones", () => {
  it("getInscripcionesByTorneo consulta alcance ver antes de listar", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /getInscripcionesByTorneo[\s\S]*AlcanceCuentaService\.consultar/);
    assert.match(ctrl, /consultar\(req\.user, torneoId, "ver"\)/);
    assert.match(ctrl, /status\(403\)/);
  });

  it("obtenerInscripciones no expone correo en el join de perfiles", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const bloque = svc.match(
      /static async obtenerInscripciones[\s\S]*?static async obtenerPartidosFormateados/,
    )?.[0];
    assert.ok(bloque);
    assert.doesNotMatch(bloque, /\bemail\b/);
  });

  it("admin_club de otro club recibe denegado (mismo criterio que programación)", () => {
    const decision = decidirAlcanceTorneo(
      { rol: "admin_club", provincia: null, clubId: "club-qa" },
      {
        alcance: "Local",
        clubId: "club-alta-barda",
        provinciaClub: "Neuquén",
      },
      "ver",
    );
    assert.equal(decision.permitido, false);
    assert.match(String(decision.motivo), /no se juega en tu club/i);
  });
});