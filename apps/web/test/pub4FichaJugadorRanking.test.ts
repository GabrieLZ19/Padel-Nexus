import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { hrefFichaJugadorPublica } from "../utils/navigation/jugadorPublico.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-4 ficha publica desde ranking", () => {
  it("arma ruta con posicion, alcance y categoria", () => {
    assert.equal(
      hrefFichaJugadorPublica("uuid-1", {
        posicion: 4,
        scope: "Provincial",
        categoria: "5",
      }),
      "/jugadores/uuid-1?posicion=4&scope=Provincial&categoria=5",
    );
  });

  it("ranking publico enlaza a /jugadores/:id", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/(public)/ranking/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /hrefFichaJugadorPublica/);
    assert.match(pagina, /player\.usuario_id/);
  });

  it("ficha jugador carga ranking por usuario", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/(public)/jugadores/[id]/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /RankingsService\.getByUserId/);
    assert.match(pagina, /JugadorPublicoRankingSection/);
  });

  it("RankingsService expone getByUserId", () => {
    const svc = readFileSync(
      path.join(RAIZ, "utils/services/rankings.ts"),
      "utf8",
    );
    assert.match(svc, /async getByUserId\(usuarioId: string\)/);
    assert.match(svc, /`\/rankings\/\$\{usuarioId\}`/);
  });
});
