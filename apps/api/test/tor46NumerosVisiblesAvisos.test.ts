import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LlaveConflictoError } from "../src/utils/edicionLlaveDuplicados.ts";
import { validarCambioEquiposConMatrizFap } from "../src/utils/edicionLlaveFap.ts";
import { crearResolverNumeroVisibleLlave } from "../src/utils/numerosVisiblesPartido.ts";
import {
  evaluateProgramacionIssues,
  seleccionarPartidosLlaveParaAutoprogramar,
} from "../src/utils/programacionPartidos.ts";

const torneoConZonas = [
  { id: "za-1", ronda: "Zona A", orden: 1 },
  { id: "za-2", ronda: "Zona A", orden: 2 },
  { id: "za-3", ronda: "Zona A", orden: 3 },
  { id: "za-4", ronda: "Zona A", orden: 4 },
  { id: "zb-1", ronda: "Zona B", orden: 1 },
  { id: "zb-2", ronda: "Zona B", orden: 2 },
  { id: "zb-3", ronda: "Zona B", orden: 3 },
  { id: "zc-1", ronda: "Zona C", orden: 1 },
  { id: "zc-2", ronda: "Zona C", orden: 2 },
  { id: "zc-3", ronda: "Zona C", orden: 3 },
  { id: "zd-1", ronda: "Zona D", orden: 1 },
  { id: "zd-2", ronda: "Zona D", orden: 2 },
  { id: "zd-3", ronda: "Zona D", orden: 3 },
  { id: "ze-1", ronda: "Zona E", orden: 1 },
  { id: "ze-2", ronda: "Zona E", orden: 2 },
  { id: "ze-3", ronda: "Zona E", orden: 3 },
  { id: "oct-50", ronda: "OCTAVOS", orden: 50 },
  { id: "oct-54", ronda: "OCTAVOS", orden: 54 },
  { id: "oct-55", ronda: "OCTAVOS", orden: 55 },
  {
    id: "cuar-58",
    ronda: "CUARTOS",
    orden: 58,
    equipo_a_id: "e1",
    equipo_b_id: "e2",
    cancha_asignada: "C1",
    fecha_partido: "2026-11-22T12:00:00.000Z",
  },
  {
    id: "cuar-57",
    ronda: "CUARTOS",
    orden: 57,
    equipo_a_id: "e3",
    equipo_b_id: "e4",
    cancha_asignada: "C2",
    fecha_partido: "2026-11-22T14:00:00.000Z",
  },
];

describe("TOR-46 numeros visibles en avisos de programacion", () => {
  it("avisos_programacion_publicada usa # visible, no orden interno 58", () => {
    const llave = torneoConZonas.filter((p) => p.ronda === "CUARTOS");
    const { avisos_programacion_publicada } =
      seleccionarPartidosLlaveParaAutoprogramar(llave, {
        programacionPublicada: true,
        violaHorarioPublicado: (p) => p.id === "cuar-58",
        partidosNumeracion: torneoConZonas,
      });
    assert.equal(avisos_programacion_publicada.length, 1);
    assert.match(avisos_programacion_publicada[0], /partido #21/);
    assert.doesNotMatch(avisos_programacion_publicada[0], /#58/);
  });

  it("evaluateProgramacionIssues cita origen con numero visible", () => {
    const feeders = new Map<number, number[]>([[58, [57]]]);
    const issues = evaluateProgramacionIssues(torneoConZonas, {
      duracionMinutos: 90,
      feedersByMatchNo: feeders,
    });
    const orden = issues.find((i) =>
      i.message.includes("partido de origen"),
    );
    assert.ok(orden);
    assert.match(orden!.message, /#20/);
    assert.doesNotMatch(orden!.message, /#57/);
  });

  it("validarCambioEquiposConMatrizFap cita # visible del origen W*, no matchNo interno", () => {
    const partidosNumeracion = torneoConZonas.map((p) => ({
      id: p.id,
      ronda: p.ronda,
      orden: p.orden,
    }));
    const resolver = crearResolverNumeroVisibleLlave(partidosNumeracion);
    assert.throws(
      () =>
        validarCambioEquiposConMatrizFap(
          { matchNo: 19, a: "1A", b: "W50" },
          "p-clas",
          null,
          "p-clas",
          "pareja-nueva",
          resolver,
        ),
      (err: unknown) => {
        assert.ok(err instanceof LlaveConflictoError);
        const msg = (err as Error).message;
        assert.match(msg, /partido #17/);
        assert.doesNotMatch(msg, /matriz/);
        assert.doesNotMatch(msg, /#50\b/);
        return true;
      },
    );
  });
});