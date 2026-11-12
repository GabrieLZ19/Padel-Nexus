import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-4 · /reservar filtros y cercanía", () => {
  it("envía coordenadas y parámetros de filtro al listado de clubes", () => {
    const src = readFileSync(
      path.join(RAIZ, "app/(public)/reservar/page.tsx"),
      "utf8",
    );
    assert.match(src, /params\.lat = userLocation\.lat/);
    assert.match(src, /params\.lng = userLocation\.lng/);
    assert.match(src, /params\.ordenar = "distancia"/);
    assert.match(src, /geoResolved/);
    assert.match(src, /max_distancia_km/);
    assert.match(src, /tipo_suelo/);
    assert.match(src, /params\.fecha = filtroFecha/);
    assert.match(src, /Distancia máxima/);
  });
});
