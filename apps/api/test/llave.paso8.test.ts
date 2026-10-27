import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { etiquetaRondaProgramador } from "../src/utils/programadorReglas";
import {
  codigoRondaPorNumeroFap,
  columnasRondaLlave,
  etiquetaRondaLlave,
  numerosVisiblesLlave,
  numerosVisiblesDePartidos,
  mapaNumeroVisiblePorMatchNo,
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

  it("asigna numeracion correlativa continua unica a todo el torneo (zonas 1..16 y llave 17..26)", () => {
    const partidosTorneo = [
      // Zona A: 4 partidos
      { id: "za-1", ronda: "Zona A", orden: 1 },
      { id: "za-2", ronda: "Zona A", orden: 2 },
      { id: "za-3", ronda: "Zona A", orden: 3 },
      { id: "za-4", ronda: "Zona A", orden: 4 },
      // Zona B: 3 partidos
      { id: "zb-1", ronda: "Zona B", orden: 1 },
      { id: "zb-2", ronda: "Zona B", orden: 2 },
      { id: "zb-3", ronda: "Zona B", orden: 3 },
      // Zona C: 3 partidos
      { id: "zc-1", ronda: "Zona C", orden: 1 },
      { id: "zc-2", ronda: "Zona C", orden: 2 },
      { id: "zc-3", ronda: "Zona C", orden: 3 },
      // Zona D: 3 partidos
      { id: "zd-1", ronda: "Zona D", orden: 1 },
      { id: "zd-2", ronda: "Zona D", orden: 2 },
      { id: "zd-3", ronda: "Zona D", orden: 3 },
      // Zona E: 3 partidos
      { id: "ze-1", ronda: "Zona E", orden: 1 },
      { id: "ze-2", ronda: "Zona E", orden: 2 },
      { id: "ze-3", ronda: "Zona E", orden: 3 },
      // Octavos (3 partidos)
      { id: "oct-50", ronda: "OCTAVOS", orden: 50 },
      { id: "oct-54", ronda: "OCTAVOS", orden: 54 },
      { id: "oct-55", ronda: "OCTAVOS", orden: 55 },
      // Cuartos (4 partidos)
      { id: "cuar-57", ronda: "CUARTOS", orden: 57 },
      { id: "cuar-58", ronda: "CUARTOS", orden: 58 },
      { id: "cuar-59", ronda: "CUARTOS", orden: 59 },
      { id: "cuar-60", ronda: "CUARTOS", orden: 60 },
      // Semis (2 partidos)
      { id: "sem-61", ronda: "SEMIS", orden: 61 },
      { id: "sem-62", ronda: "SEMIS", orden: 62 },
      // Final (1 partido)
      { id: "fin-64", ronda: "FINAL", orden: 64 },
    ];

    const mapa = numerosVisiblesDePartidos(partidosTorneo);

    // Zonas: 1 a 16 continuos
    assert.equal(mapa.get("za-1"), 1);
    assert.equal(mapa.get("za-4"), 4);
    assert.equal(mapa.get("zb-1"), 5);
    assert.equal(mapa.get("zc-1"), 8);
    assert.equal(mapa.get("zd-1"), 11);
    assert.equal(mapa.get("ze-3"), 16);

    // Llave: 17 a 26 continuos
    assert.equal(mapa.get("oct-50"), 17);
    assert.equal(mapa.get("oct-54"), 18);
    assert.equal(mapa.get("oct-55"), 19);
    assert.equal(mapa.get("cuar-57"), 20);
    assert.equal(mapa.get("cuar-58"), 21);
    assert.equal(mapa.get("cuar-59"), 22);
    assert.equal(mapa.get("cuar-60"), 23);
    assert.equal(mapa.get("sem-61"), 24);
    assert.equal(mapa.get("sem-62"), 25);
    assert.equal(mapa.get("fin-64"), 26);

    // Mapeo por matchNo para cruces de matriz
    const mapaMatchNo = mapaNumeroVisiblePorMatchNo(partidosTorneo);
    assert.equal(mapaMatchNo.get(50), 17);
    assert.equal(mapaMatchNo.get(58), 21);
    assert.equal(mapaMatchNo.get(61), 24);
    assert.equal(mapaMatchNo.get(64), 26);
  });
});
