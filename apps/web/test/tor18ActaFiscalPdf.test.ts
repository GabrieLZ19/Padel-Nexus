import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { numerosVisiblesDePartidos } from "../utils/rondasLlave.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-18 acta fiscal: numeración y rondas", () => {
  it("numeración del acta sigue zonas + llave continua", () => {
    const partidos = [
      { id: "z1", ronda: "Zona A", orden: 1 },
      { id: "z2", ronda: "Zona A", orden: 2 },
      { id: "oct", ronda: "OCTAVOS", orden: 50 },
    ];
    const mapa = numerosVisiblesDePartidos(partidos);
    assert.equal(mapa.get("z2"), 2);
    assert.equal(mapa.get("oct"), 3);
  });

  it("PDF del acta no mezcla título de ronda en columnas ni usa solo p.orden", () => {
    const pdf = readFileSync(path.join(RAIZ, "utils/actaFiscalPdf.ts"), "utf8");
    assert.match(pdf, /etiquetaNumeroPartidoVisible/);
    assert.match(pdf, /mapaNumerosVisiblesPartidos|etiquetaNumeroPartidoVisible/);
    const fiscal = readFileSync(path.join(RAIZ, "utils/fiscalPartidos.ts"), "utf8");
    assert.match(fiscal, /numerosVisiblesDePartidos/);
    assert.match(pdf, /head: \[\["#", colPartido/);
    assert.doesNotMatch(pdf, /grupo\.label\.toUpperCase\(\)/);
    assert.doesNotMatch(pdf, /p\.orden \? `#\$\{p\.orden\}`/);
  });

  it("panel fiscal lista partidos con numeración visible", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/dashboard/fiscal/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /etiquetaNumeroPartidoVisible\(numerosVisibles, p\)/);
  });
});
