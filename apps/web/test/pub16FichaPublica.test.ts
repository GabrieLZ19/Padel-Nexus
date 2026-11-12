import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ETIQUETA_PUNTOS_FICHA_PUBLICA,
  categoriasJuegoYRankingDifieren,
  subtituloMovimientoHistorial,
  tituloMovimientoHistorial,
} from "../utils/fichaPublicaJugador.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-16 ficha pública jugador", () => {
  it("usa etiqueta de puntos genérica sin sigla rectora", () => {
    assert.equal(ETIQUETA_PUNTOS_FICHA_PUBLICA, "Puntos");
    const rankingSection = readFileSync(
      path.join(RAIZ, "components/jugador/JugadorPublicoRankingSection.tsx"),
      "utf8",
    );
    assert.match(rankingSection, /ETIQUETA_PUNTOS_FICHA_PUBLICA/);
    assert.doesNotMatch(
      rankingSection,
      /textoRectora\("puntos"/,
    );
  });

  it("distingue categoría de juego y categoría en ranking", () => {
    assert.equal(categoriasJuegoYRankingDifieren("5", "6"), true);
    assert.equal(categoriasJuegoYRankingDifieren("5", "5"), false);
    assert.equal(categoriasJuegoYRankingDifieren(null, "5"), false);
    const pagina = readFileSync(
      path.join(RAIZ, "app/(public)/jugadores/[id]/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /Categoría de juego/);
    assert.match(pagina, /Categoría en ranking/);
  });

  it("arma título de movimiento con torneo y ronda", () => {
    assert.equal(
      tituloMovimientoHistorial({
        torneo_nombre: "Copa QA",
        ronda: "OCTAVOS",
      }),
      "Copa QA — Octavos de final",
    );
    const subtitulo = subtituloMovimientoHistorial({
      torneo_nombre: "Copa QA",
      ronda: "OCTAVOS",
      created_at: "2026-01-15T12:00:00.000Z",
    });
    assert.match(subtitulo, /15.*ene.*2026/i);
  });
});
