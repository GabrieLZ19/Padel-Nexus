import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  estadosActivosTablero,
  metricasProvincialesTablero,
} from "../src/utils/tableroProvincial.ts";
import { FAP_ESTADOS_TORNEO } from "../src/constants/fap.ts";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_WEB = path.resolve(RAIZ_API, "../web");

function fuenteApi(subpath: string): string {
  return readFileSync(path.join(RAIZ_API, subpath), "utf8");
}

function fuenteWeb(subpath: string): string {
  return readFileSync(path.join(RAIZ_WEB, subpath), "utf8");
}

describe("ENT-9 contador torneos provinciales (tablero asociación)", () => {
  it("métricas provinciales cuentan solo Provincial/Regional y activos de ese subconjunto", () => {
    const filas = [
      { id: "1", alcance: "Provincial", estado: FAP_ESTADOS_TORNEO.EN_CURSO },
      { id: "2", alcance: "Provincial", estado: FAP_ESTADOS_TORNEO.BORRADOR },
      { id: "3", alcance: "Regional", estado: FAP_ESTADOS_TORNEO.INSCRIPCION },
      { id: "4", alcance: "Regional", estado: FAP_ESTADOS_TORNEO.FINALIZADO },
      { id: "5", alcance: "Nacional", estado: FAP_ESTADOS_TORNEO.EN_CURSO },
      { id: "6", alcance: "Local", estado: FAP_ESTADOS_TORNEO.EN_CURSO },
    ];

    const metricas = metricasProvincialesTablero(filas, estadosActivosTablero());

    assert.equal(metricas.provinciales_total, 4);
    assert.equal(metricas.provinciales_activos, 2);
    assert.equal(metricas.clasificatorios_total, 2);
    assert.equal(metricas.nacionales_total, 1);
    assert.equal(metricas.ultimos_provinciales.length, 4);
    assert.equal(metricas.ultimos_nacionales.length, 1);
  });

  it("resumenTablero filtra por club y asociación como el listado", () => {
    const servicio = fuenteApi("src/services/torneo.service.ts");
    const inicio = servicio.indexOf("static async resumenTablero");
    const fin = servicio.indexOf("static async listarTorneos", inicio);
    assert.ok(inicio >= 0 && fin > inicio);
    const bloque = servicio.slice(inicio, fin);
    assert.match(bloque, /asociacionIds !== undefined/);
    assert.match(bloque, /asociacion_id\.in/);
    assert.match(bloque, /metricasProvincialesTablero/);
  });

  it("GET tablero pasa asociacionIds al servicio", () => {
    const controller = fuenteApi("src/controllers/torneo.controller.ts");
    assert.match(
      controller,
      /resumen === "tablero"[\s\S]*asociacionIds/,
    );
  });

  it("el panel provincial usa resumenTablero y no getAll paginado", () => {
    const panel = fuenteWeb("components/dashboard/DashboardProvincial.tsx");
    assert.match(panel, /getResumenTablero\(/);
    assert.match(panel, /provinciales_total/);
    assert.match(panel, /provinciales_activos/);
    assert.equal(panel.includes("TorneosService.getAll"), false);
    assert.equal(panel.includes("contarActivosEnConjunto"), false);
  });
});
