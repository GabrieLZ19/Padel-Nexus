import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-27 puesto del panel vs GET /rankings", () => {
  it("Mi Panel delega la posición a resolverPosicionEnRanking", () => {
    const panel = readFileSync(
      path.join(RAIZ, "src/services/panelJugador.service.ts"),
      "utf8",
    );
    assert.match(panel, /RankingService\.resolverPosicionEnRanking/);
    assert.match(panel, /normalizarRama\(perfil\?\.sexo\)/);
    assert.match(panel, /provincia_jurisdiccion/);
    assert.doesNotMatch(
      panel,
      /puestoEnCategoria[\s\S]{0,1200}\.sort\(compararPosicionRanking\)/,
    );
  });

  it("resolverPosicionEnRanking usa obtenerRankingGlobal con los mismos filtros", () => {
    const ranking = readFileSync(
      path.join(RAIZ, "src/services/ranking.service.ts"),
      "utf8",
    );
    const bloque = ranking.match(
      /static async resolverPosicionEnRanking[\s\S]*?^  \}/m,
    )?.[0];
    assert.ok(bloque);
    assert.match(bloque, /obtenerRankingGlobal/);
    assert.match(bloque, /provincia:/);
    assert.match(bloque, /rama:/);
  });
});