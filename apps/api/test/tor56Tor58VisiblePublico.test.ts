import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-56 / TOR-58 visibilidad y Paso 1", () => {
  it("Paso1Datos guarda visible_sitio_publico y es_prueba por separado", () => {
    const paso = fs.readFileSync(
      path.join(API, "../web/components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.match(paso, /visible_sitio_publico: visibleSitioPublico/);
    assert.match(paso, /es_prueba: nombreBloqueaSitioPublico \? true : esPruebaRanking/);
    assert.doesNotMatch(paso, /!visibleSitioPublico/);
    assert.match(paso, /Suma puntos al ranking oficial/);
  });

  it("torneo.service persiste visible_sitio_publico", () => {
    const svc = fs.readFileSync(
      path.join(API, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(svc, /visible_sitio_publico/);
    assert.match(svc, /resolverVisibleSitioPublico/);
    assert.match(svc, /esTorneoVisibleEnSitioPublico/);
  });

  it("Paso5 Cierre sin referencia interna es_prueba en el aviso", () => {
    const cierre = fs.readFileSync(
      path.join(API, "../web/components/torneos/wizard/Paso7Cierre.tsx"),
      "utf8",
    );
    assert.match(cierre, /Suma puntos al ranking oficial/);
    assert.doesNotMatch(cierre, /\(es_prueba\)/);
  });
});