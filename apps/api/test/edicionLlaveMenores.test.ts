import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  byesDeRonda,
  esCategoriaMenoresSuperior,
  indiceDestinoAvance,
  insercionEnBye,
  limpiarSlot,
  partidoConResultadoReal,
  puedeOcuparSlot,
  retiroConBye,
} from "../src/utils/edicionLlaveMenores";

const octavos = {
  id: "p1",
  ronda: "OCTAVOS",
  orden: 1,
  equipoAId: "pareja",
  equipoBId: "rival",
  ganador: null,
  set1A: null,
  set1B: null,
};

describe("pase de menores entre categorías", () => {
  it("Sub-16 está por encima de Sub-14 y el promocional por debajo", () => {
    assert.equal(esCategoriaMenoresSuperior("Sub-14", "Sub-16"), true);
    assert.equal(esCategoriaMenoresSuperior("Sub-16", "Sub-14"), false);
    assert.equal(
      esCategoriaMenoresSuperior("Sub-14 Promocional", "Sub-14"),
      true,
    );
    assert.equal(esCategoriaMenoresSuperior("7ª", "Sub-16"), false);
  });

  it("sacar a la pareja deja el bye al rival", () => {
    const parche = retiroConBye(octavos, "a");
    assert.equal(parche.equipoAId, null);
    assert.equal(parche.equipoBId, "rival");
    assert.equal(parche.ganador, "rival");
    assert.equal(parche.estado, "Finalizado");
  });

  it("no toca un partido que ya se jugó", () => {
    assert.equal(
      partidoConResultadoReal({ ...octavos, ganador: "pareja", set1A: 6, set1B: 3 }),
      true,
    );
    assert.throws(() =>
      retiroConBye(
        { ...octavos, ganador: "pareja", set1A: 6, set1B: 3 },
        "a",
      ),
    );
  });

  it("entrar en un bye arma el partido y no deja al rival avanzado", () => {
    const bye = {
      ...octavos,
      equipoAId: "rival",
      equipoBId: null,
      ganador: "rival",
      set1A: 0,
      set1B: 0,
    };
    const parche = insercionEnBye(bye, "b", "pareja");
    assert.equal(parche.equipoAId, "rival");
    assert.equal(parche.equipoBId, "pareja");
    assert.equal(parche.ganador, null);
    assert.equal(parche.estado, "Programado");
  });

  it("limpiar el avance no le regala el partido al otro lado", () => {
    const cuartos = {
      ...octavos,
      id: "p2",
      ronda: "CUARTOS",
      equipoAId: "pareja",
      equipoBId: "otro",
      ganador: null,
    };
    const parche = limpiarSlot(cuartos, "a");
    assert.equal(parche.equipoAId, null);
    assert.equal(parche.equipoBId, "otro");
    assert.equal(parche.ganador, null);
    assert.equal(parche.estado, "Programado");
  });

  it("ofrece el lado vacío y el avance cae en el cruce de arriba", () => {
    const byes = byesDeRonda(
      [
        { ...octavos, equipoBId: null, ganador: "pareja", set1A: 0, set1B: 0 },
        { ...octavos, id: "p2", orden: 2 },
      ],
      "OCTAVOS",
    );
    assert.deepEqual(byes, [
      { partidoId: "p1", lado: "b", rivalId: "pareja" },
    ]);
    assert.deepEqual(indiceDestinoAvance(0), { indiceHijo: 0, lado: "a" });
    assert.deepEqual(indiceDestinoAvance(1), { indiceHijo: 0, lado: "b" });
    assert.equal(puedeOcuparSlot(null, "pareja"), true);
    assert.equal(puedeOcuparSlot("pareja", "pareja"), true);
    assert.equal(puedeOcuparSlot("otro", "pareja"), false);
  });
});
