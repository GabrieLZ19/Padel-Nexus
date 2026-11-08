import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_WEB = path.resolve(RAIZ_API, "../web");

describe("PUB-9 ranking y apellido", () => {
  it("define apellidoValidoParaRanking en constantes", () => {
    const rankings = readFileSync(
      path.join(RAIZ_API, "src/constants/rankings.ts"),
      "utf8",
    );
    assert.match(rankings, /export function apellidoValidoParaRanking/);
    assert.match(rankings, /aTieneApellido !== bTieneApellido/);
  });

  it("obtenerRankingGlobal filtra perfiles sin apellido válido", () => {
    const svc = readFileSync(
      path.join(RAIZ_API, "src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(svc, /apellidoValidoParaRanking\(jugador\.perfiles\?\.apellido\)/);
  });

  it("registro y perfil validan apellido en API", () => {
    const auth = readFileSync(
      path.join(RAIZ_API, "src/services/auth.service.ts"),
      "utf8",
    );
    const perfil = readFileSync(
      path.join(RAIZ_API, "src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(auth, /El apellido es obligatorio/);
    assert.match(perfil, /El apellido es obligatorio/);
  });

  it("desempate en front alinea con apellido obligatorio", () => {
    const orden = readFileSync(
      path.join(RAIZ_WEB, "utils/rankings/orden.ts"),
      "utf8",
    );
    assert.match(orden, /apellidoValidoParaRanking/);
    assert.match(orden, /aTieneApellido \? -1 : 1/);
  });
});
