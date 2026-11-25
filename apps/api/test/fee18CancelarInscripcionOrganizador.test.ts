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
      org_id: "club-1",
    }),
  },
});

const { usuarioPuedeCancelarInscripcion } = await import(
  "../src/utils/inscripcionAutorizacion.ts"
);

describe("FEE-18 organizador del torneo puede cancelar inscripciones", () => {
  it("admin del club organizador puede dar de baja aunque no esté en la pareja", async () => {
    const ok = await usuarioPuedeCancelarInscripcion(
      { id: "admin-club", rol: "admin_club" },
      {
        usuario_id: "jugador-1",
        usuario2_id: "jugador-2",
        torneo_id: "torneo-1",
      },
    );
    assert.equal(ok, true);
  });
});