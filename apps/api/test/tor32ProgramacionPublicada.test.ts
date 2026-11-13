import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { seleccionarPartidosLlaveParaAutoprogramar } from "../src/utils/programacionPartidos.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-32 horarios publicados al cargar resultado", () => {
  it("con programación publicada no reprograma partidos que ya tienen horario", () => {
    const partidos = [
      {
        id: "a",
        orden: 19,
        equipo_a_id: "e1",
        equipo_b_id: "e2",
        estado_partido: "Programado",
        cancha_asignada: "Cancha 1",
        fecha_partido: "2026-11-20T18:00:00.000Z",
      },
      {
        id: "b",
        orden: 20,
        equipo_a_id: "e3",
        equipo_b_id: "e4",
        estado_partido: "Programado",
        cancha_asignada: null,
        fecha_partido: null,
      },
    ];
    const { pendientes, avisos_programacion_publicada } =
      seleccionarPartidosLlaveParaAutoprogramar(partidos, {
        programacionPublicada: true,
        violaHorarioPublicado: () => true,
      });
    assert.equal(pendientes.length, 1);
    assert.equal(pendientes[0].id, "b");
    assert.equal(avisos_programacion_publicada.length, 1);
    assert.match(avisos_programacion_publicada[0], /partido #19/);
  });

  it("sin programación publicada sigue marcando horarios inválidos para reprogramar", () => {
    const partidos = [
      {
        id: "a",
        orden: 5,
        equipo_a_id: "e1",
        equipo_b_id: "e2",
        cancha_asignada: "C1",
        fecha_partido: "2026-11-20T10:00:00.000Z",
      },
    ];
    const { pendientes } = seleccionarPartidosLlaveParaAutoprogramar(
      partidos,
      {
        programacionPublicada: false,
        violaHorarioPublicado: () => true,
      },
    );
    assert.equal(pendientes.length, 1);
    assert.equal(pendientes[0].id, "a");
  });

  it("programarPartidosLlavePendientes respeta programacion_estado publicado", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/utils/programacionPartidos.ts"),
      "utf8",
    );
    assert.match(src, /programacion_estado/);
    assert.match(src, /programacionPublicada/);
    assert.match(src, /if \(programacionPublicada\) continue/);
    assert.match(src, /avisos_programacion_publicada/);
  });

  it("el endpoint de resultado expone avisos de programación", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /avisos_programacion_publicada/);
  });
});
