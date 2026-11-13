import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estadoTrasAsignarConMatrizFap,
  validarCambioEquiposConMatrizFap,
} from "../src/utils/edicionLlaveFap.ts";
import { LlaveConflictoError } from "../src/utils/edicionLlaveDuplicados.ts";
import type { PartidoEditable } from "../src/utils/edicionLlaveMenores.ts";

const partidoVacio: PartidoEditable = {
  id: "m19",
  ronda: "OCTAVOS",
  orden: 19,
  equipoAId: "pareja-1a",
  equipoBId: null,
  ganador: null,
  set1A: null,
  set1B: null,
};

describe("TOR-28 llave FAP — slots W* y bye", () => {
  it("rechaza asignar pareja en lado reservado para ganador", () => {
    assert.throws(
      () =>
        validarCambioEquiposConMatrizFap(
          { matchNo: 19, a: "1A", b: "W16", winnerTo: 22 },
          "p1",
          null,
          "p1",
          "pareja-nueva",
        ),
      (err: unknown) => {
        assert.ok(err instanceof LlaveConflictoError);
        assert.match((err as Error).message, /lado B.*ganador/i);
        return true;
      },
    );
  });

  it("no otorga bye automático si el otro lado espera W*", () => {
    const parche = estadoTrasAsignarConMatrizFap(
      partidoVacio,
      "pareja-1a",
      null,
      { matchNo: 19, a: "1A", b: "W16", winnerTo: 22 },
    );
    assert.equal(parche.ganador, null);
    assert.equal(parche.estado, "Programado");
    assert.equal(parche.set1A, null);
    assert.equal(parche.set1B, null);
  });

  it("permite reemplazar solo el lado de clasificado directo", () => {
    assert.doesNotThrow(() =>
      validarCambioEquiposConMatrizFap(
        { matchNo: 19, a: "1A", b: "W16", winnerTo: 22 },
        "p-old",
        null,
        "p-new",
        null,
      ),
    );
  });
});
