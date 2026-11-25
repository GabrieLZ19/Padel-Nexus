import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  mergeOcupadosSemilla,
  ocupadosSemillaEventoParaTorneo,
  validarSolapesAgendaCompartida,
} from "../src/utils/programacionEvento.ts";
import { buildOcupadosDesdePartidos } from "../src/utils/programacionPartidos.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-8 generar cuadros y publicar respetando evento", () => {
  it("generarFaseGrupos pasa ocupados de otras categorías al scheduler", () => {
    const competencia = readFileSync(
      path.join(RAIZ, "src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(competencia, /ocupadosSemillaEventoParaTorneo/);
    assert.match(
      competencia,
      /programarPartidosConDisponibilidad\(torneoId, partidosZonaFase,\s*\{[\s\S]*ocupados: ocupadosEvento/,
    );
    assert.match(
      competencia,
      /programarLlaveInicialTrasZonasFap\([\s\S]*ocupadosSemilla: ocupadosEvento/,
    );
  });

  it("getBoard mezcla issues cruzados cuando el torneo pertenece a un evento", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(svc, /grupo_id/);
    assert.match(svc, /issuesCruzadosEvento/);
  });

  it("publicar usa getBoard con conflictos graves (incluye cruce de evento)", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(svc, /static async publicar/);
    assert.match(svc, /conflictosGraves = board\.issues\.filter/);
  });

  it("mergeOcupadosSemilla combina slots de otras categorías", () => {
    const local = buildOcupadosDesdePartidos([
      {
        cancha_asignada: "Club - 1",
        fecha_partido: "2026-11-28T12:00:00.000Z",
      },
    ]);
    const remoto = buildOcupadosDesdePartidos([
      {
        cancha_asignada: "Club - 2",
        fecha_partido: "2026-11-28T13:00:00.000Z",
      },
    ]);
    const merged = mergeOcupadosSemilla(local, remoto);
    assert.equal(merged.size, 2);
  });

  it("sin grupo_id ocupadosSemillaEventoParaTorneo devuelve conjunto vacío", async () => {
    const out = await ocupadosSemillaEventoParaTorneo(
      "00000000-0000-4000-8000-000000000000",
    );
    assert.equal(out.size, 0);
  });

  it("validarSolapes detecta cancha compartida entre categorías", () => {
    const msg = validarSolapesAgendaCompartida(
      [
        {
          id: "p1",
          torneo_id: "t1",
          cancha_asignada: "Cancha 1",
          fecha_partido: "2026-11-28T13:00:00.000Z",
        },
        {
          id: "p2",
          torneo_id: "t2",
          cancha_asignada: null,
          fecha_partido: null,
        },
      ],
      "p2",
      "Cancha 1",
      "2026-11-28T13:00:00.000Z",
      { duracionMinutos: 90 },
    );
    assert.match(String(msg), /Cancha ocupada/i);
  });
});