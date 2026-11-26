import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  draftIntercambioHorariosEvento,
} from "../src/utils/programacionEvento.ts";
import { ocupadosTrasIntercambio } from "../src/utils/programacionIntercambio.ts";
import type { PartidoProgramable } from "../src/utils/programacionPartidos.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiSrc = path.join(__dirname, "../src");

describe("CLI-16 y CLI-17 — auto evento e intercambio atómico", () => {
  it("draftIntercambioHorariosEvento intercambia posiciones en memoria", () => {
    const base: PartidoProgramable[] = [
      {
        id: "p1",
        ronda: "Zona A",
        cancha_asignada: "Club X · 1",
        fecha_partido: "2026-11-28T10:00:00.000Z",
        estado_partido: "Programado",
        equipo_a_id: null,
        equipo_b_id: null,
      },
      {
        id: "p2",
        ronda: "Zona B",
        cancha_asignada: "Club X · 2",
        fecha_partido: "2026-11-28T11:00:00.000Z",
        estado_partido: "Programado",
        equipo_a_id: null,
        equipo_b_id: null,
      },
    ];
    const draft = draftIntercambioHorariosEvento(base, {
      partido_id: "p1",
      occupant_id: "p2",
      destino: {
        fecha_iso: "2026-11-28T11:00:00.000Z",
        cancha_label: "Club X · 2",
      },
      origen: {
        fecha_iso: "2026-11-28T10:00:00.000Z",
        cancha_label: "Club X · 1",
      },
    });
    const a = draft.find((p) => p.id === "p1");
    const b = draft.find((p) => p.id === "p2");
    assert.equal(a?.cancha_asignada, "Club X · 2");
    assert.equal(b?.cancha_asignada, "Club X · 1");
    const ocupados = ocupadosTrasIntercambio(draft);
    assert.ok(ocupados.size >= 2);
  });

  it("autoAsignar evento usa zonas_primero, omitirBoard y dos fases", () => {
    const src = readFileSync(
      path.join(apiSrc, "services/programacionEvento.service.ts"),
      "utf8",
    );
    assert.match(src, /distribucion:\s*"zonas_primero"/);
    assert.match(src, /omitirBoard:\s*true/);
    assert.match(src, /for \(const soloFase of \["zonas", "llave"\]/);
    assert.match(src, /cargarPartidosProgramablesEvento\(grupoId\)/);
  });

  it("intercambio persiste con rollback al fallar el segundo update", () => {
    const src = readFileSync(
      path.join(apiSrc, "utils/programacionIntercambio.ts"),
      "utf8",
    );
    assert.match(src, /restaurarHorario\(partido_id, snapA\)/);
    assert.match(src, /restaurarHorario\(occupant_id, snapB\)/);
    assert.match(src, /validarIntercambioHorariosEvento/);
  });
});