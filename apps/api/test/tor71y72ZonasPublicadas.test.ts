import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  analizarCambiosZonas,
  partidoTieneResultadoCargado,
} from "../src/utils/zonasOverride";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("TOR-71 y TOR-72 zonas publicadas", () => {
  it("partidoTieneResultadoCargado reconoce ganador, finalizado y sets", () => {
    assert.equal(
      partidoTieneResultadoCargado({ ganador: "ins-1" }),
      true,
    );
    assert.equal(
      partidoTieneResultadoCargado({ estado_partido: "Finalizado" }),
      true,
    );
    assert.equal(
      partidoTieneResultadoCargado({ set1_a: 6, set1_b: 4 }),
      true,
    );
    assert.equal(partidoTieneResultadoCargado({ estado_partido: "Programado" }), false);
  });

  it("analizarCambiosZonas detecta intercambio simétrico D↔E", () => {
    const antes = new Map<string, string>([
      ["p1", "g-d"],
      ["p2", "g-d"],
      ["p3", "g-e"],
    ]);
    const conteos = new Map([
      ["g-d", 2],
      ["g-e", 1],
    ]);
    const zonas = [
      { id: "g-d", parejas: [{ id: "p2" }, { id: "p3" }] },
      { id: "g-e", parejas: [{ id: "p1" }] },
    ];
    const r = analizarCambiosZonas(zonas, antes, conteos);
    assert.equal(r.cardinalidadPreservada, true);
    assert.equal(r.esSoloIntercambioSimetrico, true);
    assert.equal(r.intercambios.length, 1);
    assert.deepEqual(
      new Set([r.intercambios[0].inscripcionA, r.intercambios[0].inscripcionB]),
      new Set(["p1", "p3"]),
    );
  });

  it("analizarCambiosZonas rechaza movimiento simple (cambia cardinalidad)", () => {
    const antes = new Map<string, string>([
      ["p1", "g-d"],
      ["p2", "g-d"],
      ["p3", "g-e"],
    ]);
    const conteos = new Map([
      ["g-d", 2],
      ["g-e", 1],
    ]);
    const zonas = [
      { id: "g-d", parejas: [{ id: "p2" }] },
      { id: "g-e", parejas: [{ id: "p3" }, { id: "p1" }] },
    ];
    const r = analizarCambiosZonas(zonas, antes, conteos);
    assert.equal(r.cardinalidadPreservada, false);
    assert.equal(r.esSoloIntercambioSimetrico, false);
  });

  it("moverPareja bloquea programación publicada y valida resultados", () => {
    const svc = readFileSync(
      path.join(RAIZ, "api/src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /assertInscripcionesSinResultadoEnTorneo/);
    assert.match(svc, /programacion_estado.*publicado/);
    assert.match(svc, /aplicarIntercambiosPublicadoEnPartidos/);
    assert.match(svc, /horario_bloqueado/);
  });

  it("controlador devuelve 409 para ZonasOverrideError", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "api/src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /ZonasOverrideError/);
    assert.match(ctrl, /error\.statusCode/);
  });
});