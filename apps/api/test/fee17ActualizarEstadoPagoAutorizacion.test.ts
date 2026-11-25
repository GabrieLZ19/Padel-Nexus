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

const { usuarioPuedeActualizarEstadoPagoInscripcion } = await import(
  "../src/utils/inscripcionAutorizacion.ts"
);

describe("FEE-17 autorización PATCH inscripciones/:id/pago", () => {
  it("ruta exige rol administrativo y el controlador pasa el actor", () => {
    const routes = readFileSync(`${root}src/routes/inscripcion.routes.ts`, "utf8");
    const bloque = routes.match(
      /router\.patch\(\s*"\/:id\/pago"[\s\S]*?updateEstadoPago/,
    )?.[0];
    assert.ok(bloque);
    assert.match(bloque!, /authorize\(ROLES_ADMINISTRATIVOS\)/);

    const ctrl = readFileSync(
      `${root}src/controllers/inscripcion.controller.ts`,
      "utf8",
    );
    assert.match(
      ctrl,
      /updateEstadoPago[\s\S]*actualizarEstadoPago\([\s\S]*rol: req\.user\?\.rol/,
    );
    assert.match(ctrl, /No tenés permiso[\s\S]*403/);
  });

  it("el servicio valida organizador del torneo antes de actualizar", () => {
    const svc = readFileSync(
      `${root}src/services/inscripcion.service.ts`,
      "utf8",
    );
    assert.match(svc, /usuarioPuedeActualizarEstadoPagoInscripcion/);
    assert.match(
      svc,
      /No tenés permiso para actualizar el pago de esta inscripción/,
    );

    const util = readFileSync(
      `${root}src/utils/inscripcionAutorizacion.ts`,
      "utf8",
    );
    assert.match(
      util,
      /usuarioPuedeActualizarEstadoPagoInscripcion[\s\S]*usuarioPuedeSaldoTorneo/,
    );
    assert.doesNotMatch(
      util,
      /usuarioPuedeActualizarEstadoPagoInscripcion[\s\S]*usuario_id === user\.id/,
    );
  });

  it("superadmin puede actualizar; club ajeno no", async () => {
    assert.equal(
      await usuarioPuedeActualizarEstadoPagoInscripcion(
        { id: "root", rol: "superadmin" },
        "torneo-ajeno",
      ),
      true,
    );
    assert.equal(
      await usuarioPuedeActualizarEstadoPagoInscripcion(
        { id: "new-center-admin", rol: "admin_club" },
        "torneo-qa-club",
      ),
      false,
    );
  });
});