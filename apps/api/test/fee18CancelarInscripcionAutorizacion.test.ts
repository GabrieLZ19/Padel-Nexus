import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const orgUrl = new URL("../src/utils/platformFeeOrgUsuario.ts", import.meta.url)
  .href;

mock.module(orgUrl, {
  namedExports: {
    usuarioPuedeSaldoTorneo: async () => false,
    resolverOrgFeeDesdeUsuario: async () => null,
  },
});

const { usuarioPuedeCancelarInscripcion } = await import(
  "../src/utils/inscripcionAutorizacion.ts"
);

const INSCRIPCION = {
  usuario_id: "jugador-1",
  usuario2_id: "jugador-2",
  torneo_id: "torneo-1",
};

describe("FEE-18 autorización DELETE inscripciones", () => {
  it("ruta exige sesión y el controlador pasa el actor al servicio", () => {
    const routes = readFileSync(`${root}src/routes/inscripcion.routes.ts`, "utf8");
    assert.match(routes, /router\.use\(authenticate\)/);
    assert.match(routes, /router\.delete\("\/:id", deleteInscripcion\)/);

    const ctrl = readFileSync(
      `${root}src/controllers/inscripcion.controller.ts`,
      "utf8",
    );
    assert.match(
      ctrl,
      /deleteInscripcion[\s\S]*cancelarInscripcion\(id,\s*\{[\s\S]*rol: req\.user\?\.rol/,
    );
    assert.match(ctrl, /No tenés permiso[\s\S]*403/);
  });

  it("cancelarInscripción valida pareja, superadmin u organizador del torneo", () => {
    const svc = readFileSync(
      `${root}src/services/inscripcion.service.ts`,
      "utf8",
    );
    assert.match(svc, /usuarioPuedeCancelarInscripcion/);
    assert.match(svc, /No tenés permiso para cancelar esta inscripción/);

    const util = readFileSync(
      `${root}src/utils/inscripcionAutorizacion.ts`,
      "utf8",
    );
    assert.match(util, /usuario_id === user\.id/);
    assert.match(util, /usuario2_id === user\.id/);
    assert.match(util, /superadmin/);
    assert.match(util, /usuarioPuedeSaldoTorneo/);
  });

  it("jugadores de la pareja y superadmin pueden cancelar", async () => {
    assert.equal(
      await usuarioPuedeCancelarInscripcion(
        { id: "jugador-1", rol: "usuario" },
        INSCRIPCION,
      ),
      true,
    );
    assert.equal(
      await usuarioPuedeCancelarInscripcion(
        { id: "jugador-2", rol: "usuario" },
        INSCRIPCION,
      ),
      true,
    );
    assert.equal(
      await usuarioPuedeCancelarInscripcion(
        { id: "cualquiera", rol: "superadmin" },
        INSCRIPCION,
      ),
      true,
    );
  });

  it("usuario con sesión ajeno no puede cancelar si no es organizador", async () => {
    const ok = await usuarioPuedeCancelarInscripcion(
      { id: "qa-padel116", rol: "usuario" },
      INSCRIPCION,
    );
    assert.equal(ok, false);
  });
});