import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  filtrarFilasRankingPorProvincia,
  jugadorPerteneceProvinciaRanking,
  provinciaParaRanking,
} from "../src/utils/provinciaRanking.ts";
import { normalizarProvincia } from "../src/constants/rankings.ts";

const MAP_QA = new Map<string, string>([["APN", "Neuquén"]]);

describe("PUB-27 filtro provincial del ranking", () => {
  it("jugadores con sigla APN entran en Provincial · Neuquén", () => {
    assert.equal(provinciaParaRanking("APN", MAP_QA), "Neuquén");
    assert.ok(
      jugadorPerteneceProvinciaRanking(
        "APN",
        null,
        MAP_QA,
        "Neuquén",
      ),
    );
    assert.ok(
      !jugadorPerteneceProvinciaRanking(
        "APN",
        null,
        MAP_QA,
        "Buenos Aires",
      ),
    );
  });

  it("no confunde provincia canónica con sigla de otra jurisdicción", () => {
    assert.ok(
      jugadorPerteneceProvinciaRanking(
        "La Rioja",
        "Neuquén",
        MAP_QA,
        "La Rioja",
      ),
    );
    assert.ok(
      !jugadorPerteneceProvinciaRanking(
        "La Rioja",
        "Neuquén",
        MAP_QA,
        "Buenos Aires",
      ),
    );
  });

  it("acepta Neuquen sin tilde en el filtro", () => {
    assert.equal(
      normalizarProvincia("Neuquén"),
      normalizarProvincia("Neuquen"),
    );
    assert.ok(
      jugadorPerteneceProvinciaRanking(
        "APN",
        null,
        MAP_QA,
        "Neuquen",
      ),
    );
  });

  it("33 jugadores QA con residencia APN aparecen en Neuquén 7ª (re-test vacío)", () => {
    const filas = Array.from({ length: 33 }, (_, i) => ({
      usuario_id: `user-${i + 1}`,
      puntos: 90 - i,
      perfiles: {
        lugar_residencia: "APN",
        clubes: { provincia: "Neuquén" },
      },
    }));
    filas.push({
      usuario_id: "rio-1",
      puntos: 500,
      perfiles: {
        lugar_residencia: "La Rioja",
        clubes: { provincia: "La Rioja" },
      },
    });
    filas.push({
      usuario_id: "bsas-1",
      puntos: 400,
      perfiles: {
        lugar_residencia: "Buenos Aires",
        clubes: { provincia: "Buenos Aires" },
      },
    });

    const neuquen = filtrarFilasRankingPorProvincia(
      filas,
      "Neuquén",
      MAP_QA,
    );
    assert.equal(neuquen.length, 33);
    assert.ok(neuquen.every((j) => j.perfiles?.lugar_residencia === "APN"));

    const bsas = filtrarFilasRankingPorProvincia(
      filas,
      "Buenos Aires",
      MAP_QA,
    );
    assert.equal(bsas.length, 1);
    assert.equal(bsas[0]?.usuario_id, "bsas-1");
  });

  it("ranking.service usa filtrarFilasRankingPorProvincia (PUB-27)", () => {
    const raiz = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
    );
    const fuente = readFileSync(
      path.join(raiz, "src/services/ranking.service.ts"),
      "utf8",
    );
    assert.match(fuente, /filtrarFilasRankingPorProvincia/);
    assert.doesNotMatch(
      fuente,
      /normalizarProvincia\(jugador\.perfiles\?\.lugar_residencia\) === provNorm/,
    );
  });
});