import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { normalizarFechaProgramacionDia } from "../src/utils/programacionPartidos.ts";
import {
  construirFranjasPorDiaBoard,
  franjaHorariaDesdeDisponibilidad,
} from "../src/utils/persistirFranjasProgramacion.ts";
import { generarSlotsDesdeSedesYVentana } from "../src/utils/programacionPartidos.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuenteWeb(relativo: string): string {
  return readFileSync(path.join(RAIZ, "apps/web", relativo), "utf8");
}

function fuenteApi(relativo: string): string {
  return readFileSync(path.join(RAIZ, "apps/api", relativo), "utf8");
}

describe("TOR-3 descanso e inicio por día persisten en programador", () => {
  it("normaliza fechas con timestamp para lookup de franjas", () => {
    assert.equal(
      normalizarFechaProgramacionDia("2026-11-10T03:00:00.000Z"),
      "2026-11-10",
    );
    assert.equal(
      normalizarFechaProgramacionDia("2026-11-10 00:00:00+00"),
      "2026-11-10",
    );
  });

  it("construirFranjasPorDiaBoard hidrata inicio desde DB tras recargar sin query", () => {
    const disponibilidad = [
      {
        club_id: "c1",
        cancha_id: "ca1",
        fecha: "2026-11-10T00:00:00+00:00",
        hora_inicio: "10:30:00",
        hora_fin: "22:00:00",
      } as never,
    ];
    const map = construirFranjasPorDiaBoard(["2026-11-10"], disponibilidad);
    assert.equal(map["2026-11-10"].inicio, "10:30");
    assert.equal(map["2026-11-10"].fin, "22:00");
  });

  it("generarSlots usa hora_inicio persistida (no 08:00 por defecto)", () => {
    const canchas = [
      {
        club_id: "c1",
        cancha_id: "ca1",
        fecha: "2026-11-10T00:00:00Z",
        hora_inicio: "10:00:00",
        hora_fin: "23:59:59",
        clubes: { nombre: "Club QA" },
        canchas: { nombre: "Cancha 1" },
      } as never,
    ];
    const slots = generarSlotsDesdeSedesYVentana({
      canchas,
      dias: ["2026-11-10"],
      duracionMinutos: 90,
    });
    assert.ok(slots.length > 0);
    const horas = [...new Set(slots.map((s) => s.hora.slice(0, 5)))].sort();
    assert.equal(horas[0], "10:00");
    assert.equal(horas.includes("08:00"), false);
  });

  it("lee hora_inicio/hora_fin de disponibilidad aunque fecha venga con hora", () => {
    const franja = franjaHorariaDesdeDisponibilidad(
      [
        {
          club_id: "c1",
          cancha_id: "ca1",
          fecha: "2026-11-10T00:00:00+00:00",
          hora_inicio: "09:30:00",
          hora_fin: "23:59:59",
        } as never,
      ],
      "2026-11-10",
    );
    assert.ok(franja);
    assert.equal(franja!.inicio, "09:30");
    assert.equal(franja!.fin, "00:00");
  });

  it("expone POST programacion/config y persistirConfigProgramacion", () => {
    const routes = fuenteApi("src/routes/torneo.routes.ts");
    assert.match(routes, /programacion\/config/);
    assert.match(routes, /persistirConfigProgramacion/);
    const ctrl = fuenteApi("src/controllers/programacion.controller.ts");
    assert.match(ctrl, /ProgramacionService\.persistirConfigProgramacion/);
  });

  it("el hook del programador persiste config al cambiar franjas o descanso", () => {
    const hook = fuenteWeb("components/torneos/programador/useProgramadorBoard.ts");
    assert.match(hook, /persistirConfigProgramacion/);
    assert.match(hook, /next\?\.franjasPorDia != null/);
    assert.match(hook, /next\?\.descansoModo != null/);
  });

  it("guardar borrador y auto-asignar reutilizan persistir franjas", () => {
    const svc = fuenteApi("src/services/programacion.service.ts");
    assert.match(svc, /persistirFranjasPorDiaTorneo/);
    assert.match(svc, /persistirDescansoYDuracionTorneo/);
  });

  it("persistir franjas matchea fechas con timestamp en disponibilidad", () => {
    const src = fuenteApi("src/utils/persistirFranjasProgramacion.ts");
    assert.match(src, /normalizarFechaProgramacionDia\(row\.fecha\)/);
    assert.doesNotMatch(src, /\.eq\("fecha", fecha\)/);
  });

  it("asignar lote respeta descanso persistido y feeders de llave", () => {
    const svc = fuenteApi("src/services/programacion.service.ts");
    const bloque = svc.slice(
      svc.indexOf("static async asignarLote"),
      svc.indexOf("static async desasignar"),
    );
    assert.match(bloque, /feedersForTorneo/);
    assert.match(bloque, /limitarAIds/);
    assert.match(bloque, /descansoModo/);
    assert.match(bloque, /sin_slot_ids/);
  });
});
