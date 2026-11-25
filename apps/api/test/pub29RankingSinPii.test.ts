import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { sanitizarPerfilRankingPublico } from "../src/utils/rankingRespuestaPublica.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("PUB-29 ranking público sin DNI ni datos sensibles", () => {
  it("GET /rankings es ruta pública sin authenticate", () => {
    const routes = readFileSync(`${root}src/routes/ranking.routes.ts`, "utf8");
    assert.match(
      routes,
      /router\.get\("\/", RankingsController\.obtenerRankingGlobal\)/,
    );
    const bloqueGlobal = routes.match(
      /router\.get\("\/", RankingsController\.obtenerRankingGlobal\);/,
    )?.[0];
    assert.ok(bloqueGlobal);
    assert.doesNotMatch(bloqueGlobal!, /authenticate/);
  });

  it("obtenerRankingGlobal y por club sanitizan perfiles antes de responder", () => {
    const svc = readFileSync(
      `${root}src/services/ranking.service.ts`,
      "utf8",
    );
    assert.match(svc, /sanitizarPerfilRankingPublico/);
    assert.match(
      svc,
      /obtenerRankingGlobal[\s\S]*sanitizarPerfilRankingPublico/,
    );
    assert.match(
      svc,
      /obtenerRankingPorClub[\s\S]*sanitizarPerfilRankingPublico/,
    );
  });

  it("sanitizarPerfilRankingPublico elimina PII y campos internos", () => {
    const limpio = sanitizarPerfilRankingPublico({
      nombre: "Juan",
      apellido: "Perez",
      dni: "30123456",
      fecha_nacimiento: "1990-01-01",
      sexo: "Masculino",
      email: "juan@test.com",
      es_prueba: false,
      rol: "usuario",
      avatar_url: "https://cdn/1.png",
      lugar_residencia: "Neuquen",
    });

    assert.equal(limpio.nombre, "Juan");
    assert.equal(limpio.apellido, "Perez");
    assert.equal(limpio.avatar_url, "https://cdn/1.png");
    assert.equal("dni" in limpio, false);
    assert.equal("fecha_nacimiento" in limpio, false);
    assert.equal("sexo" in limpio, false);
    assert.equal("email" in limpio, false);
    assert.equal("es_prueba" in limpio, false);
    assert.equal("rol" in limpio, false);
  });
});