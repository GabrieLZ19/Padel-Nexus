import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  leerConfigPuntosProvincia,
  puntosDeRondaProvincial,
  puntosInscripcionPorMejorInstancia,
  sumarPuntosPorProvincia,
  type LadosProvincia,
} from "../src/utils/puntosProvincia";

describe("puntos de provincia", () => {
  it("suma desde octavos y no antes", () => {
    assert.equal(puntosDeRondaProvincial("FINAL", "ganador"), 8);
    assert.equal(puntosDeRondaProvincial("FINAL", "perdedor"), 6);
    assert.equal(puntosDeRondaProvincial("SEMIS", "perdedor"), 4);
    assert.equal(puntosDeRondaProvincial("CUARTOS", "perdedor"), 2);
    assert.equal(puntosDeRondaProvincial("OCTAVOS", "perdedor"), 1);
    assert.equal(puntosDeRondaProvincial("PRELIMINARES", "perdedor"), 0);
    assert.equal(puntosDeRondaProvincial("16AVOS", "perdedor"), 0);
    assert.equal(puntosDeRondaProvincial("32AVOS", "ganador"), 0);
  });

  it("el campeón se queda con 8 y no acumula las rondas previas", () => {
    const puntos = puntosInscripcionPorMejorInstancia([
      { ronda: "OCTAVOS", ganadorId: "cordoba-a", perdedorId: "otra" },
      { ronda: "CUARTOS", ganadorId: "cordoba-a", perdedorId: "otra-2" },
      { ronda: "SEMIS", ganadorId: "cordoba-a", perdedorId: "rio" },
      { ronda: "FINAL", ganadorId: "cordoba-a", perdedorId: "neuquen-a" },
    ]);
    assert.equal(puntos.get("cordoba-a"), 8);
    assert.equal(puntos.get("neuquen-a"), 6);
    assert.equal(puntos.get("rio"), 4);
  });

  it("antes de la instancia elegida no suma", () => {
    const config = leerConfigPuntosProvincia({
      puntos_provincia: {
        desde: "CUARTOS",
        campeon: 8,
        finalista: 6,
        semis: 4,
        cuartos: 2,
        octavos: 1,
      },
    });
    assert.equal(puntosDeRondaProvincial("OCTAVOS", "perdedor", config), 0);
    assert.equal(puntosDeRondaProvincial("CUARTOS", "perdedor", config), 2);
  });

  it("el ejemplo de libres 7ª suma por provincia", () => {
    const partidos = [
      ["cordoba-a", "neuquen-a", "FINAL"],
      ["cordoba-a", "rio-negro-a", "SEMIS"],
      ["neuquen-a", "chaco-a", "SEMIS"],
      ["cordoba-a", "buenos-aires-a", "CUARTOS"],
      ["rio-negro-a", "tucuman", "CUARTOS"],
      ["neuquen-a", "chubut-b", "CUARTOS"],
      ["chaco-a", "chubut-a", "CUARTOS"],
      ["cordoba-a", "cordoba-b", "OCTAVOS"],
      ["buenos-aires-a", "neuquen-b", "OCTAVOS"],
      ["tucuman", "chaco-b", "OCTAVOS"],
      ["chubut-b", "cordoba-e", "OCTAVOS"],
      ["chubut-a", "cordoba-c", "OCTAVOS"],
      ["rio-negro-a", "neuquen-c", "OCTAVOS"],
      ["chaco-a", "cordoba-d", "OCTAVOS"],
      ["neuquen-a", "buenos-aires-b", "OCTAVOS"],
    ] as const;

    const puntos = puntosInscripcionPorMejorInstancia(
      partidos.map(([ganadorId, perdedorId, ronda]) => ({
        ronda,
        ganadorId,
        perdedorId,
      })),
    );

    const provincia: Record<string, string> = {
      "cordoba-a": "Córdoba",
      "cordoba-b": "Córdoba",
      "cordoba-e": "Córdoba",
      "cordoba-c": "Córdoba",
      "cordoba-d": "Córdoba",
      "neuquen-a": "Neuquén",
      "neuquen-b": "Neuquén",
      "neuquen-c": "Neuquén",
      "chaco-a": "Chaco",
      "chaco-b": "Chaco",
      "chubut-a": "Chubut",
      "chubut-b": "Chubut",
      "rio-negro-a": "Río Negro",
      "buenos-aires-a": "Buenos Aires",
      "buenos-aires-b": "Buenos Aires",
      tucuman: "Tucumán",
    };

    const total = new Map<string, number>();
    for (const [id, pts] of puntos) {
      const nombre = provincia[id];
      total.set(nombre, (total.get(nombre) || 0) + pts);
    }

    assert.equal(puntos.get("cordoba-b"), 1);
    assert.equal(puntos.get("cordoba-e"), 1);
    assert.equal(total.get("Córdoba"), 12);
    assert.equal(total.get("Neuquén"), 8);
    assert.equal(total.get("Chaco"), 5);
    assert.equal(total.get("Chubut"), 4);
    assert.equal(total.get("Río Negro"), 4);
    assert.equal(total.get("Buenos Aires"), 3);
    assert.equal(total.get("Tucumán"), 2);
  });
});

describe("ranking nacional, caso general", () => {
  const misma = (provincia: string): LadosProvincia => ({
    provinciaA: provincia,
    provinciaB: provincia,
  });

  it("el ejemplo del documento cierra en la tabla pedida", () => {
    const parejas = [
      "cordoba-a",
      "cordoba-b",
      "cordoba-e",
      "cordoba-c",
      "cordoba-d",
      "neuquen-a",
      "neuquen-b",
      "neuquen-c",
      "chaco-a",
      "chaco-b",
      "chubut-a",
      "chubut-b",
      "rio-negro-a",
      "buenos-aires-a",
      "buenos-aires-b",
      "tucuman",
    ];
    const provincia: Record<string, string> = {
      "cordoba-a": "Córdoba",
      "cordoba-b": "Córdoba",
      "cordoba-e": "Córdoba",
      "cordoba-c": "Córdoba",
      "cordoba-d": "Córdoba",
      "neuquen-a": "Neuquén",
      "neuquen-b": "Neuquén",
      "neuquen-c": "Neuquén",
      "chaco-a": "Chaco",
      "chaco-b": "Chaco",
      "chubut-a": "Chubut",
      "chubut-b": "Chubut",
      "rio-negro-a": "Río Negro",
      "buenos-aires-a": "Buenos Aires",
      "buenos-aires-b": "Buenos Aires",
      tucuman: "Tucumán",
    };
    const cruces: Array<[string, string, string]> = [
      ["cordoba-a", "neuquen-a", "FINAL"],
      ["cordoba-a", "rio-negro-a", "SEMIS"],
      ["neuquen-a", "chaco-a", "SEMIS"],
      ["cordoba-a", "buenos-aires-a", "CUARTOS"],
      ["rio-negro-a", "tucuman", "CUARTOS"],
      ["neuquen-a", "chubut-b", "CUARTOS"],
      ["chaco-a", "chubut-a", "CUARTOS"],
      ["cordoba-a", "cordoba-b", "OCTAVOS"],
      ["buenos-aires-a", "neuquen-b", "OCTAVOS"],
      ["tucuman", "chaco-b", "OCTAVOS"],
      ["chubut-b", "cordoba-e", "OCTAVOS"],
      ["chubut-a", "cordoba-c", "OCTAVOS"],
      ["rio-negro-a", "neuquen-c", "OCTAVOS"],
      ["chaco-a", "cordoba-d", "OCTAVOS"],
      ["neuquen-a", "buenos-aires-b", "OCTAVOS"],
    ];

    const puntos = puntosInscripcionPorMejorInstancia(
      cruces.map(([ganadorId, perdedorId, ronda]) => ({
        ronda,
        ganadorId,
        perdedorId,
      })),
    );
    const tabla = sumarPuntosPorProvincia(
      puntos,
      new Map(parejas.map((id) => [id, misma(provincia[id])])),
    );
    const porNombre = new Map(tabla.map((fila) => [fila.provincia, fila.puntos]));

    assert.deepEqual(
      [...porNombre.entries()],
      [
        ["Córdoba", 12],
        ["Neuquén", 8],
        ["Chaco", 5],
        ["Chubut", 4],
        ["Río Negro", 4],
        ["Buenos Aires", 3],
        ["Tucumán", 2],
      ],
    );
  });

  it("el torneo de prueba 4ª suma solo la mejor instancia de cada pareja", () => {
    const cruces: Array<[string, string, string]> = [
      ["cordoba-a", "neuquen-a", "FINAL"],
      ["cordoba-a", "rio-a", "SEMIS"],
      ["neuquen-a", "ba-a", "SEMIS"],
      ["cordoba-a", "cordoba-b", "CUARTOS"],
      ["rio-a", "rio-b", "CUARTOS"],
      ["neuquen-a", "neuquen-b", "CUARTOS"],
      ["ba-a", "ba-b", "CUARTOS"],
    ];
    const provincia: Record<string, string> = {
      "cordoba-a": "Córdoba",
      "cordoba-b": "Córdoba",
      "neuquen-a": "Neuquén",
      "neuquen-b": "Neuquén",
      "rio-a": "Río Negro",
      "rio-b": "Río Negro",
      "ba-a": "Buenos Aires",
      "ba-b": "Buenos Aires",
    };
    const puntos = puntosInscripcionPorMejorInstancia(
      cruces.map(([ganadorId, perdedorId, ronda]) => ({
        ronda,
        ganadorId,
        perdedorId,
      })),
      leerConfigPuntosProvincia(null),
    );
    const tabla = sumarPuntosPorProvincia(
      puntos,
      new Map(Object.keys(provincia).map((id) => [id, misma(provincia[id])])),
    );

    assert.deepEqual(
      tabla.map((fila) => [fila.provincia, fila.puntos]),
      [
        ["Córdoba", 10],
        ["Neuquén", 8],
        ["Buenos Aires", 6],
        ["Río Negro", 6],
      ],
    );
  });

  it("una pareja de dos provincias reparte los puntos y una tabla propia reemplaza el 8", () => {
    const config = leerConfigPuntosProvincia({
      puntos_provincia: {
        desde: "FINAL",
        campeon: 20,
        finalista: 10,
        semis: 4,
        cuartos: 2,
        octavos: 1,
      },
    });
    const puntos = puntosInscripcionPorMejorInstancia(
      [
        { ronda: "OCTAVOS", ganadorId: "mix", perdedorId: "otra" },
        { ronda: "FINAL", ganadorId: "mix", perdedorId: "local" },
      ],
      config,
    );
    assert.equal(puntos.get("mix"), 20);
    assert.equal(puntos.get("otra"), undefined);

    const tabla = sumarPuntosPorProvincia(
      puntos,
      new Map([
        ["mix", { provinciaA: "Córdoba", provinciaB: "Neuquén" }],
        ["local", misma("Buenos Aires")],
      ]),
    );
    const porNombre = new Map(tabla.map((fila) => [fila.provincia, fila.puntos]));
    assert.equal(porNombre.get("Córdoba"), 10);
    assert.equal(porNombre.get("Neuquén"), 10);
    assert.equal(porNombre.get("Buenos Aires"), 10);
  });
});
