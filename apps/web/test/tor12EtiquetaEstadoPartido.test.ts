import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  etiquetaEstadoPartidoLlave,
  partidoEstaEnCurso,
} from "../utils/etiquetaEstadoPartido.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-12 etiqueta de estado en llave", () => {
  it("octavos programados con equipos no se marcan En juego", () => {
    const partido = {
      ganador: null,
      estado_partido: "Programado",
      equipo_a_id: "a",
      equipo_b_id: "b",
      fecha_partido: "2026-11-08T18:00:00.000Z",
      cancha_asignada: "Cancha 1",
    };
    assert.equal(etiquetaEstadoPartidoLlave(partido), "Programado");
    assert.equal(partidoEstaEnCurso(partido), false);
  });

  it("solo estado En curso muestra En juego", () => {
    const partido = {
      ganador: null,
      estado_partido: "En curso",
      equipo_a_id: "a",
      equipo_b_id: "b",
      fecha_partido: null,
      cancha_asignada: null,
    };
    assert.equal(etiquetaEstadoPartidoLlave(partido), "En juego");
    assert.equal(partidoEstaEnCurso(partido), true);
  });

  it("MatchCard no usa isActive para el texto En juego", () => {
    const card = readFileSync(
      path.join(RAIZ, "components/torneos/MatchCard.tsx"),
      "utf8",
    );
    assert.match(card, /etiquetaEstadoPartidoLlave/);
    assert.doesNotMatch(card, /isActive \? "En juego"/);
  });
});
