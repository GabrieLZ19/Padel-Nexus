import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

const orgUrl = new URL("../src/utils/platformFeeOrgUsuario.ts", import.meta.url)
  .href;

mock.module(orgUrl, {
  namedExports: {
    usuarioPuedeSaldoTorneo: async () => true,
    resolverOrgFeeDesdeUsuario: async () => ({
      org_tipo: "club",
      org_id: "club-qa",
    }),
  },
});

const { usuarioPuedeActualizarEstadoPagoInscripcion } = await import(
  "../src/utils/inscripcionAutorizacion.ts"
);

describe("FEE-17 organizador del torneo puede marcar pago", () => {
  it("admin del club organizador puede confirmar inscripciones de su torneo", async () => {
    const ok = await usuarioPuedeActualizarEstadoPagoInscripcion(
      { id: "admin-qa", rol: "admin_club" },
      "torneo-qa-club",
    );
    assert.equal(ok, true);
  });
});