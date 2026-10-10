import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hrefDetalleTorneo,
  numeroPasoVisible,
  pasoSegunEstadoTorneo,
} from "../../web/components/torneos/wizard/stepLocks";

describe("paso inicial del torneo", () => {
  it("abre el paso que corresponde al estado", () => {
    assert.equal(pasoSegunEstadoTorneo("Borrador"), "edit");
    assert.equal(pasoSegunEstadoTorneo("Inscripción"), "players");
    assert.equal(pasoSegunEstadoTorneo("Cerrado"), "draws");
    assert.equal(pasoSegunEstadoTorneo("Programado"), "draws");
    assert.equal(pasoSegunEstadoTorneo("En curso"), "matches");
    assert.equal(pasoSegunEstadoTorneo("Finalizado"), "matches");
    assert.equal(
      hrefDetalleTorneo("/dashboard", { id: "hr", estado: "En curso" }),
      "/dashboard/torneos/hr?step=matches",
    );
  });

  it("usa el mismo número en el índice y en el título", () => {
    assert.equal(numeroPasoVisible("cierre"), 7);
    assert.equal(numeroPasoVisible("draws"), 8);
    assert.equal(numeroPasoVisible("matches"), 9);
    assert.equal(numeroPasoVisible("cierre", ["fiscales"]), 6);
    assert.equal(numeroPasoVisible("draws", ["fiscales"]), 7);
    assert.equal(numeroPasoVisible("matches", ["fiscales"]), 8);
    assert.equal(numeroPasoVisible("times", ["fiscales"]), 5);
  });
});
