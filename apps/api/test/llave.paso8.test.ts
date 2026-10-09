import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { etiquetaRondaProgramador } from "../src/utils/programadorReglas";
import {
  codigoRondaPorNumeroFap,
  columnasRondaLlave,
  etiquetaRondaLlave,
  numerosVisiblesLlave,
  ordenRondaLlave,
  vincularPartidosAMatriz,
} from "../../web/utils/rondasLlave";

const RONDAS = [
  "32AVOS",
  "16AVOS",
  "PRELIMINARES",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
] as const;

describe("cuadros paso 8", () => {
  it("usa el nombre completo en español y no PRELIMINAR ni 8vos", () => {
    for (const ronda of RONDAS) {
      const etiqueta = etiquetaRondaLlave(ronda);
      assert.equal(etiqueta, etiquetaRondaProgramador(ronda));
      assert.equal(/preliminar/i.test(etiqueta), false);
      assert.equal(/8vos|16avos|32avos/i.test(etiqueta), false);
    }
    assert.equal(etiquetaRondaLlave("PRELIMINARES"), "Dieciseisavos de final");
    assert.equal(etiquetaRondaLlave("32AVOS"), "Treintaidosavos de final");
  });

  it("ordena la llave de octavos hacia la final", () => {
    const orden = ["OCTAVOS", "CUARTOS", "SEMIS", "FINAL"].map(ordenRondaLlave);
    assert.deepEqual(
      [...orden].sort((a, b) => a - b),
      orden,
    );
    assert.ok(ordenRondaLlave("32AVOS") < ordenRondaLlave("PRELIMINARES"));
    assert.ok(ordenRondaLlave("PRELIMINARES") < ordenRondaLlave("OCTAVOS"));
  });

  it("numera la llave después de las zonas y no muestra el número de la matriz", () => {
    const matriz16 = [50, 54, 55, 57, 58, 59, 60, 61, 62, 64];
    const numeros = numerosVisiblesLlave(matriz16, 17);
    assert.equal(numeros.get(50), 17);
    assert.equal(numeros.get(57), 20);
    assert.equal(numeros.get(58), 21);
    assert.equal(numeros.get(64), 26);
    assert.equal(numeros.has(57) && numeros.get(57) !== 57, true);

    const columnas = columnasRondaLlave(matriz16);
    assert.ok((columnas.get(50) ?? 0) < (columnas.get(58) ?? 0));
    assert.ok((columnas.get(58) ?? 0) < (columnas.get(61) ?? 0));
    assert.ok((columnas.get(61) ?? 0) < (columnas.get(64) ?? 0));
    assert.equal(codigoRondaPorNumeroFap(33), "16AVOS");
    assert.equal(codigoRondaPorNumeroFap(64), "FINAL");
  });

  it("engancha la llave guardada aunque el orden no sea el número de la matriz", () => {
    const matriz16 = [50, 54, 55, 57, 58, 59, 60, 61, 62, 64];
    const porOrden = vincularPartidosAMatriz(matriz16, [
      { id: "c1", ronda: "CUARTOS", orden: 57 },
      { id: "f", ronda: "FINAL", orden: 64 },
    ]);
    assert.equal(porOrden.get(57), "c1");
    assert.equal(porOrden.get(64), "f");

    const porRonda = vincularPartidosAMatriz(matriz16, [
      { id: "q0", ronda: "CUARTOS", orden: 100 },
      { id: "q1", ronda: "CUARTOS", orden: 101 },
      { id: "s0", ronda: "SEMIS", orden: 104 },
      { id: "fin", ronda: "FINAL", orden: 106 },
    ]);
    assert.equal(porRonda.get(57), "q0");
    assert.equal(porRonda.get(58), "q1");
    assert.equal(porRonda.get(61), "s0");
    assert.equal(porRonda.get(64), "fin");
    assert.equal(porRonda.has(50), false);
  });
});
