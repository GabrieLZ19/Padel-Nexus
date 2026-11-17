import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildZonePairCountsFromZonas,
  equipoIdVisibleEnSlotFap,
} from "../utils/fapZoneSeeds.ts";
import { formatearResumenTrasGuardarZonas } from "../utils/resumenLlaveZonas.ts";

describe("TOR-24 resumen y vista de llave", () => {
  it("oculta equipo en slot 2B si la zona B queda de 2", () => {
    const counts = buildZonePairCountsFromZonas([
      { nombre: "Zona B", parejas: [{}, {}] },
    ]);
    assert.equal(
      equipoIdVisibleEnSlotFap("2B", "insc-stale", counts),
      null,
    );
    assert.equal(
      equipoIdVisibleEnSlotFap("1B", "insc-ok", counts),
      "insc-ok",
    );
  });

  it("formatearResumen no lista 2B como pendiente si la zona B tiene 2 parejas", () => {
    const zonas = [
      { nombre: "Zona A", parejas: [{}, {}, {}] },
      { nombre: "Zona B", parejas: [{}, {}] },
    ];
    const texto = formatearResumenTrasGuardarZonas(
      {
        llave: {
          semillas_pendientes: ["1B", "2B", "2A"],
        },
      },
      zonas,
    );
    assert.match(texto, /1B/);
    assert.match(texto, /2A/);
    assert.ok(!/\b2B\b/.test(texto));
  });
});