import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { inferirPuntosActivados } from "../utils/puntosTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-35 UI cierre y puntos", () => {
  it("inferirPuntosActivados en web coincide con ranking vinculado", () => {
    assert.equal(inferirPuntosActivados(undefined, "Privado"), true);
    assert.equal(inferirPuntosActivados({ puntos_activados: false }, "Privado"), false);
  });

  it("Paso Cierre avisa y permite activar post-cierre", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso7Cierre.tsx"),
      "utf8",
    );
    assert.match(fuente, /inferirPuntosActivados/);
    assert.match(fuente, /Ranking vinculado sin puntos activos/);
    assert.match(fuente, /activarPuntosRankingPostCierre/);
  });

  it("Paso Resultados avisa si la final cierra sin puntos", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso9Arbitraje.tsx"),
      "utf8",
    );
    assert.match(fuente, /avisos_ranking/);
    assert.match(fuente, /Torneo finalizado sin puntos/);
  });
});
