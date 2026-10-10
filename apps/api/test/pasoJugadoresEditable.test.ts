import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertPasoJugadoresEditable } from "../src/utils/inscripcionElegibilidad";

describe("paso de jugadores en modo lectura", () => {
  it("rechaza altas y bajas cuando el torneo está en curso", () => {
    assert.throws(
      () => assertPasoJugadoresEditable({ estado: "En curso" }),
      /en curso/,
    );
    assert.throws(
      () => assertPasoJugadoresEditable({ estado: "Programado" }),
      /programado/i,
    );
    assert.throws(
      () => assertPasoJugadoresEditable({ estado: "Finalizado" }),
      /finalizado/i,
    );
  });

  it("permite el paso mientras la inscripción sigue abierta", () => {
    assert.doesNotThrow(() =>
      assertPasoJugadoresEditable({ estado: "Inscripción" }),
    );
    assert.doesNotThrow(() =>
      assertPasoJugadoresEditable({ estado: "Borrador" }),
    );
  });
});
