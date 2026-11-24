import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ordenInscripcionesZonaCuatroFinales,
  puedeClasificarZonaCuatroPorFinales,
} from "../src/utils/clasificacionZonas.ts";

const IDS = {
  uno: "ins-1",
  dos: "ins-2",
  tres: "ins-3",
  cuatro: "ins-4",
} as const;

/**
 * Re-test 24/11: semifinales 6-3 6-4; estadísticas globales empatan;
 * el orden sale solo de finales de ganadores y perdedores.
 */
describe("TOR-52 zona de 4 — finales ganadores / perdedores", () => {
  const fixtureCompleto = () => [
    {
      orden: 1,
      equipo_a_id: IDS.uno,
      equipo_b_id: IDS.cuatro,
      ganador: IDS.uno,
      estado_partido: "Finalizado",
    },
    {
      orden: 2,
      equipo_a_id: IDS.dos,
      equipo_b_id: IDS.tres,
      ganador: IDS.dos,
      estado_partido: "Finalizado",
    },
    {
      orden: 3,
      equipo_a_id: IDS.uno,
      equipo_b_id: IDS.dos,
      ganador: IDS.uno,
      estado_partido: "Finalizado",
    },
    {
      orden: 4,
      equipo_a_id: IDS.cuatro,
      equipo_b_id: IDS.tres,
      ganador: IDS.cuatro,
      estado_partido: "Finalizado",
    },
  ];

  it("clasifica 1º–4º por finales sin depender de puntos/sets", () => {
    const partidos = fixtureCompleto();
    assert.equal(puedeClasificarZonaCuatroPorFinales(partidos, 4), true);
    assert.deepEqual(ordenInscripcionesZonaCuatroFinales(partidos), [
      IDS.uno,
      IDS.dos,
      IDS.cuatro,
      IDS.tres,
    ]);
  });

  it("no clasifica por finales si falta el partido de perdedores", () => {
    const partidos = fixtureCompleto().map((p) =>
      p.orden === 4 ? { ...p, ganador: null as string | null } : p,
    );
    assert.equal(puedeClasificarZonaCuatroPorFinales(partidos, 4), false);
    assert.deepEqual(ordenInscripcionesZonaCuatroFinales(partidos), []);
  });

  it("detecta formato FAP con estados Pendiente Ganadores / Perdedores", () => {
    const partidos = [
      {
        orden: 1,
        equipo_a_id: IDS.uno,
        equipo_b_id: IDS.cuatro,
        ganador: IDS.uno,
        estado_partido: "Finalizado",
      },
      {
        orden: 2,
        equipo_a_id: IDS.dos,
        equipo_b_id: IDS.tres,
        ganador: IDS.dos,
        estado_partido: "Finalizado",
      },
      {
        orden: 3,
        equipo_a_id: null,
        equipo_b_id: null,
        ganador: null,
        estado_partido: "Pendiente Ganadores",
      },
      {
        orden: 4,
        equipo_a_id: null,
        equipo_b_id: null,
        ganador: null,
        estado_partido: "Pendiente Perdedores",
      },
    ];
    assert.equal(puedeClasificarZonaCuatroPorFinales(partidos, 4), false);
  });

  it("ClasificacionService aplica resolver de finales (TOR-52)", () => {
    const src = fs.readFileSync(
      path.resolve(import.meta.dirname, "../src/services/clasificacion.service.ts"),
      "utf-8",
    );
    assert.match(src, /puedeClasificarZonaCuatroPorFinales/);
    assert.match(src, /ordenInscripcionesZonaCuatroFinales/);
  });
});