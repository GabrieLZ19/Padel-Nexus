import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { validarSolapesAgendaCompartida } from "../src/utils/programacionEvento.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FECHA_SLOT = "2026-11-28T13:00:00.000Z";

describe("CLI-7 celda ocupada por otra categoría", () => {
  it("rechaza asignar en cancha/horario ya tomados por otra categoría", () => {
    const partidos = [
      {
        id: "p-cat-a",
        torneo_id: "torneo-cat-a",
        ronda: "ZONA A",
        equipo_a_id: "insc-a1",
        equipo_b_id: "insc-a2",
        cancha_asignada: "Club QA - Cancha 1",
        fecha_partido: FECHA_SLOT,
        estado_partido: "Programado",
      },
      {
        id: "p-cat-b",
        torneo_id: "torneo-cat-b",
        ronda: "ZONA B",
        equipo_a_id: "insc-b1",
        equipo_b_id: "insc-b2",
        cancha_asignada: null,
        fecha_partido: null,
        estado_partido: "Programado",
      },
    ];

    const msg = validarSolapesAgendaCompartida(
      partidos,
      "p-cat-b",
      "Club QA - Cancha 1",
      FECHA_SLOT,
      { duracionMinutos: 90 },
    );

    assert.equal(
      msg,
      "Cancha ocupada en ese horario (otra categoría del evento)",
    );
  });

  it("ProgramacionService.asignar valida evento cuando hay grupo_id", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(svc, /if \(torneo\.grupo_id\)/);
    assert.match(svc, /validarAsignacionEnEvento/);
  });
});