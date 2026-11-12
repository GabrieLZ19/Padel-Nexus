import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  cabezaPorMejorRanking,
  idsCabezasGlobalesDesdeZonas,
  resolverCabezasEnZona,
  zonaConMultiplesCabezas,
  zonaConMultiplesCabezasRanking,
} from "../utils/cabezasSerieZonas.ts";
import type { ParejaDrag, ZonaDrag } from "../components/torneos/DragDropPairing";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-21 cabezas de serie en editor de zonas", () => {
  it("detecta conflicto con dos cabezas en una zona", () => {
    const zonas: ZonaDrag[] = [
      {
        id: "z1",
        nombre: "Zona A",
        parejas: [
          { id: "p1", jugador1_nombre: "A", jugador2_nombre: "B", seed: 1, cabezaDeSerie: true },
          { id: "p2", jugador1_nombre: "C", jugador2_nombre: "D", seed: 2, cabezaDeSerie: true },
        ],
      },
    ];
    const c = zonaConMultiplesCabezas(zonas);
    assert.ok(c);
    assert.equal(c.candidatos.length, 2);
  });

  it("resuelve dejando una sola cabeza", () => {
    const zona: ZonaDrag = {
      id: "z1",
      nombre: "Zona A",
      parejas: [
        {
          id: "p1",
          jugador1_nombre: "A",
          jugador2_nombre: "B",
          seed: 1,
          cabezaDeSerie: true,
          puntos_ranking: 50,
        },
        {
          id: "p2",
          jugador1_nombre: "C",
          jugador2_nombre: "D",
          seed: 2,
          cabezaDeSerie: true,
          puntos_ranking: 120,
        },
      ],
    };
    const elegido = cabezaPorMejorRanking(zona.parejas);
    assert.equal(elegido, "p2");
    const resuelta = resolverCabezasEnZona(zona, elegido);
    assert.equal(
      resuelta.parejas.filter((p) => p.cabezaDeSerie).length,
      1,
    );
  });

  it("detecta dos del top ranking en la misma zona", () => {
    const zonas: ZonaDrag[] = [
      {
        id: "z1",
        nombre: "Zona D",
        parejas: [
          {
            id: "top1",
            jugador1_nombre: "A",
            jugador2_nombre: "B",
            seed: 1,
            puntos_ranking: 500,
          },
          {
            id: "top2",
            jugador1_nombre: "C",
            jugador2_nombre: "D",
            seed: 2,
            puntos_ranking: 400,
          },
        ],
      },
      {
        id: "z2",
        nombre: "Zona B",
        parejas: [
          {
            id: "p3",
            jugador1_nombre: "E",
            jugador2_nombre: "F",
            seed: 1,
            puntos_ranking: 50,
          },
        ],
      },
    ];
    const globales = idsCabezasGlobalesDesdeZonas(zonas);
    const c = zonaConMultiplesCabezasRanking(zonas, globales);
    assert.ok(c);
    assert.equal(c?.zona.nombre, "Zona D");
  });

  it("BracketEditor confirma conflicto y persiste al guardar", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /Dos cabezas de serie en la misma zona/);
    assert.match(editor, /es_cabeza_serie/);
    assert.match(editor, /Elegí la pareja/);
    assert.match(editor, /validarCabezasSerie \? "ON" : "OFF"/);
    assert.match(editor, /abrirModalConflictoRanking/);
  });
});
