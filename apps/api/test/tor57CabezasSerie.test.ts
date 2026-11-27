import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-57 persistir cabezas de serie antes de generar", () => {
  it("generarFaseGrupos acepta cabezasSerieActivas en opciones", () => {
    const svc = fs.readFileSync(
      path.join(API, "src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /cabezasSerieActivas\?: boolean/);
    assert.match(svc, /persistirCabezasSerieActivas/);
    assert.match(svc, /es_cabeza_serie: cabezasSerieActivas && idx === 0/);
  });

  it("generarZonas reenvía cabezas_serie_activas del body", () => {
    const ctrl = fs.readFileSync(
      path.join(API, "src/controllers/competencia.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /cabezas_serie_activas/);
    assert.match(ctrl, /validarCabezasSerie/);
    assert.match(ctrl, /cabezasSerieActivas/);
  });

  it("ruta PUT cabezas-serie-activas con alcance", () => {
    const routes = fs.readFileSync(
      path.join(API, "src/routes/torneo.routes.ts"),
      "utf8",
    );
    assert.match(routes, /cabezas-serie-activas/);
    assert.match(routes, /actualizarCabezasSerieActivas/);
    const ctrl = fs.readFileSync(
      path.join(API, "src/controllers/competencia.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /export const actualizarCabezasSerieActivas/);
    assert.match(ctrl, /AlcanceCuentaService\.exigir/);
  });
});