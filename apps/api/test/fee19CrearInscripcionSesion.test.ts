import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertJugador1EsUsuarioSesion,
  MENSAJE_JUGADOR1_SESION,
} from "../src/utils/inscripcionAutorizacion.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-19 jugador 1 desde sesión en POST /inscripciones", () => {
  it("controlador usa req.user.id y rechaza usuario_id distinto", () => {
    const ctrl = readFileSync(
      `${root}src/controllers/inscripcion.controller.ts`,
      "utf8",
    );
    assert.match(ctrl, /assertJugador1EsUsuarioSesion/);
    assert.match(
      ctrl,
      /createInscripcion[\s\S]*const usuarioSesionId = req\.user\?\.id/,
    );
    assert.match(
      ctrl,
      /jugador1Id: usuarioSesionId/,
    );
    assert.doesNotMatch(
      ctrl,
      /usuarioSolicitanteId = usuario_id/,
    );
    assert.match(ctrl, /assertJugador1EsUsuarioSesion[\s\S]*403/);
  });

  it("frontend web y mobile no envían usuario_id en inscribir", () => {
    const webSvc = readFileSync(
      `${root}../web/utils/services/inscripciones.ts`,
      "utf8",
    );
    assert.doesNotMatch(webSvc, /inscribir\(data:[\s\S]*usuario_id: string/);

    const mobileSvc = readFileSync(
      `${root}../mobile/src/services/inscripciones.ts`,
      "utf8",
    );
    assert.doesNotMatch(
      mobileSvc,
      /inscribir\(data:[\s\S]*usuario_id: string/,
    );
  });

  it("assertJugador1EsUsuarioSesion permite omitir o coincidir usuario_id", () => {
    assert.doesNotThrow(() =>
      assertJugador1EsUsuarioSesion("uid-1", undefined),
    );
    assert.doesNotThrow(() =>
      assertJugador1EsUsuarioSesion("uid-1", "uid-1"),
    );
    assert.throws(
      () => assertJugador1EsUsuarioSesion("uid-1", "uid-otro"),
      (err: unknown) =>
        err instanceof Error && err.message === MENSAJE_JUGADOR1_SESION,
    );
  });
});