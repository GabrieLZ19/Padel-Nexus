import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-43 puntos de llave sin colisión unique_usuario_categoria", () => {
  it("otorgarPuntosPartidoTorneo busca ranking solo por usuario_id y categoría", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/utils/otorgarPuntosPartidoTorneo.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      fuente,
      /\.eq\("alcance", alcanceRanking\)/,
      "No debe filtrar por alcance al cargar la fila de ranking",
    );
    assert.match(fuente, /onConflict: "usuario_id,categoria"/);
  });

  it("procesarResultadoYAvance revierte el partido si falla el otorgamiento de puntos", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(
      fuente,
      /catch \(puntosError\)[\s\S]*?estado_partido: previo\.estado_partido/,
    );
  });

  it("actualizarPuntosJugador usa el mismo onConflict que otorgar puntos", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(fuente, /onConflict: "usuario_id,categoria"/);
    assert.doesNotMatch(
      fuente,
      /\.eq\("alcance", alcanceFinal\)/,
      "Admin override no debe depender de alcance para encontrar la fila",
    );
  });
});