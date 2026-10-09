import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resumirLicenciasPorJugador } from "../src/utils/resumenLicencias.ts";

describe("resumen de licencias por jugador", () => {
  it("cuenta una vez a cada jugador y los estados suman el total", () => {
    const resumen = resumirLicenciasPorJugador([
      { licencias: [{ estado: "Activa" }, { estado: "Pendiente" }] },
      { licencias: [{ estado: "Activa" }] },
      { licencias: [{ estado: "Vencida" }] },
      { licencias: [{ estado: "Suspendida" }] },
      { licencias: [{ estado: null }] },
    ]);

    assert.equal(resumen.pendientes, 1);
    assert.equal(resumen.vigentes, 1);
    assert.equal(resumen.vencidas, 1);
    assert.equal(resumen.rechazadas, 1);
    assert.equal(resumen.otros, 1);
    assert.equal(
      resumen.pendientes +
        resumen.vigentes +
        resumen.vencidas +
        resumen.rechazadas +
        resumen.otros,
      resumen.total,
    );
  });
});
