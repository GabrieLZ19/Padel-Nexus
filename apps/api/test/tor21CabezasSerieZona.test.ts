import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  elegirCabezaSerieEnZona,
  marcarCabezasUnicasEnZonas,
} from "../src/utils/cabezasSerieZonas.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("TOR-21 cabezas de serie por zona", () => {
  it("deja una sola cabeza por zona (mejor ranking)", () => {
    const cabezas = new Set(["a", "b"]);
    const puntos = new Map([
      ["a", 100],
      ["b", 200],
    ]);
    const persistidas = new Map<string, boolean>();
    const flags = marcarCabezasUnicasEnZonas(
      [{ id: "z1", parejas: [{ id: "a" }, { id: "b" }] }],
      cabezas,
      puntos,
      persistidas,
    );
    assert.equal(flags.get("a"), false);
    assert.equal(flags.get("b"), true);
  });

  it("respeta cabeza elegida manualmente", () => {
    const elegida = elegirCabezaSerieEnZona(
      ["a", "b"],
      new Set(["a", "b"]),
      new Map([
        ["a", 300],
        ["b", 100],
      ]),
      new Map(),
      "b",
    );
    assert.equal(elegida, "b");
  });

  it("persiste es_cabeza_serie al guardar zonas", () => {
    const svc = readFileSync(
      path.join(RAIZ, "api/src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /es_cabeza_serie/);
    assert.match(svc, /resoluciones_cabezas_serie/);
    assert.match(svc, /resumenAuditoria/);
    assert.match(svc, /resumen: resumenAuditoria/);
    assert.doesNotMatch(
      svc.slice(svc.indexOf("static async guardarZonas")),
      /reglamento FAP/,
    );
  });
});
