import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  mapaNumeroVisiblePorMatchNo,
  numerosVisiblesDePartidos,
} from "../utils/rondasLlave.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("P4 / CUA-01: numeración única zonas + llave", () => {
  const partidosTorneo = [
    { id: "za-1", ronda: "Zona A", orden: 1 },
    { id: "za-2", ronda: "Zona A", orden: 2 },
    { id: "za-3", ronda: "Zona A", orden: 3 },
    { id: "za-4", ronda: "Zona A", orden: 4 },
    { id: "zb-1", ronda: "Zona B", orden: 1 },
    { id: "zb-2", ronda: "Zona B", orden: 2 },
    { id: "zb-3", ronda: "Zona B", orden: 3 },
    { id: "zc-1", ronda: "Zona C", orden: 1 },
    { id: "zc-2", ronda: "Zona C", orden: 2 },
    { id: "zc-3", ronda: "Zona C", orden: 3 },
    { id: "zd-1", ronda: "Zona D", orden: 1 },
    { id: "zd-2", ronda: "Zona D", orden: 2 },
    { id: "zd-3", ronda: "Zona D", orden: 3 },
    { id: "ze-1", ronda: "Zona E", orden: 1 },
    { id: "ze-2", ronda: "Zona E", orden: 2 },
    { id: "ze-3", ronda: "Zona E", orden: 3 },
    { id: "oct-50", ronda: "OCTAVOS", orden: 50 },
    { id: "oct-54", ronda: "OCTAVOS", orden: 54 },
    { id: "oct-55", ronda: "OCTAVOS", orden: 55 },
    { id: "cuar-57", ronda: "CUARTOS", orden: 57 },
    { id: "cuar-58", ronda: "CUARTOS", orden: 58 },
    { id: "cuar-59", ronda: "CUARTOS", orden: 59 },
    { id: "cuar-60", ronda: "CUARTOS", orden: 60 },
    { id: "sem-61", ronda: "SEMIS", orden: 61 },
    { id: "sem-62", ronda: "SEMIS", orden: 62 },
    { id: "fin-64", ronda: "FINAL", orden: 64 },
  ];

  it("con partidos completos la llave empieza en #17", () => {
    const mapa = numerosVisiblesDePartidos(partidosTorneo);
    assert.equal(mapa.get("ze-3"), 16);
    assert.equal(mapa.get("oct-50"), 17);
    assert.equal(mapa.get("fin-64"), 26);

    const porMatchNo = mapaNumeroVisiblePorMatchNo(partidosTorneo);
    assert.equal(porMatchNo.get(50), 17);
    assert.equal(porMatchNo.get(64), 26);
  });

  it("con solo playoff + inicioLlave=17 también numera #17..#26 (diagrama FAP)", () => {
    const soloLlave = partidosTorneo.filter(
      (p) => !/^Zona\s+/i.test(String(p.ronda)),
    );
    const mapa = numerosVisiblesDePartidos(soloLlave, 17);
    assert.equal(mapa.get("oct-50"), 17);
    assert.equal(mapa.get("cuar-57"), 20);
    assert.equal(mapa.get("fin-64"), 26);

    const porMatchNo = mapaNumeroVisiblePorMatchNo(
      soloLlave,
      [50, 54, 55, 57, 58, 59, 60, 61, 62, 64],
      17,
    );
    assert.equal(porMatchNo.get(50), 17);
    assert.equal(porMatchNo.get(57), 20);
    assert.equal(porMatchNo.get(64), 26);
  });

  it("FapBracketDiagram usa inicioNumeracion al mapear números visibles", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/FapBracketDiagram.tsx"),
      "utf8",
    );
    assert.match(
      fuente,
      /mapaNumeroVisiblePorMatchNo\(\s*partidos,\s*matches\.map\(\(m\) => m\.matchNo\),\s*inicioNumeracion,/,
    );
  });

  it("BracketEditor y vistas públicas/fiscal pasan la lista completa de partidos", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /partidos=\{partidos\}/);
    assert.equal(editor.includes("partidos={playoffPartidos}"), false);

    const publico = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(
      publico,
      /<FapBracketDiagram[\s\S]*?partidos=\{partidos\}/,
    );

    const fiscal = readFileSync(
      path.join(RAIZ, "app/dashboard/fiscal/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(
      fiscal,
      /<FapBracketDiagram[\s\S]*?partidos=\{partidos\}/,
    );
  });
});
