import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { validarSolapesAgendaCompartida } from "../src/utils/programacionEvento.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-3 programador maestro", () => {
  it("validarSolapesAgendaCompartida detecta cancha ocupada entre categorías", () => {
    const partidos = [
      {
        id: "a",
        torneo_id: "t1",
        ronda: "ZONA A",
        equipo_a_id: "p1",
        equipo_b_id: "p2",
        cancha_asignada: "Club - 1",
        fecha_partido: "2026-11-28T13:00:00.000Z",
      },
      {
        id: "b",
        torneo_id: "t2",
        ronda: "ZONA B",
        equipo_a_id: "p3",
        equipo_b_id: "p4",
        cancha_asignada: null,
        fecha_partido: null,
      },
    ];
    const msg = validarSolapesAgendaCompartida(
      partidos,
      "b",
      "Club - 1",
      "2026-11-28T13:30:00.000Z",
      { duracionMinutos: 90 },
    );
    assert.match(String(msg), /Cancha ocupada/i);
  });

  it("expone rutas de programación por grupo", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/torneo.routes.ts"),
      "utf8",
    );
    assert.match(routes, /grupos\/:grupoId\/programacion\/board/);
    assert.match(routes, /getEventoProgramacionBoard/);
  });

  it("asignar de torneo valida evento si hay grupo_id", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(svc, /validarAsignacionEnEvento/);
    assert.match(svc, /grupo_id/);
  });
});