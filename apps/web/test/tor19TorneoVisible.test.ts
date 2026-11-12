import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AVISO_NOMBRE_TORNEO_PRUEBA,
  esNombreTorneoDePrueba,
} from "../utils/datoPruebaTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_API = path.resolve(RAIZ, "../api");

describe("TOR-19 visible en sitio y nombres de ensayo", () => {
  it("detecta «test» como nombre de ensayo", () => {
    assert.equal(esNombreTorneoDePrueba("Open test 32 parejas"), true);
    assert.equal(esNombreTorneoDePrueba("Copa Oficial Verano"), false);
  });

  it("web y API comparten el mismo patrón de nombre", () => {
    const web = readFileSync(
      path.join(RAIZ, "utils/datoPruebaTorneo.ts"),
      "utf8",
    );
    const api = readFileSync(
      path.join(RAIZ_API, "src/utils/datoPrueba.ts"),
      "utf8",
    );
    const patWeb = web.match(
      /NOMBRE_TORNEO_PRUEBA\s*=\s*\n?\s*(\/[^;]+\/i)/,
    )?.[1];
    const patApi = api.match(
      /NOMBRE_TORNEO_PRUEBA\s*=\s*\n?\s*(\/[^;]+\/i)/,
    )?.[1];
    assert.ok(patWeb);
    assert.equal(patWeb, patApi);
    assert.match(patWeb, /\\btest\\b/);
  });

  it("crear/editar torneo confirma al desmarcar Visible", () => {
    const modal = readFileSync(
      path.join(RAIZ, "components/torneos/TorneoModal.tsx"),
      "utf8",
    );
    const paso1 = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.match(modal, /solicitarOcultarSitioPublico/);
    assert.match(paso1, /solicitarOcultarSitioPublico/);
    assert.match(modal, /Torneo de ensayo/);
    assert.match(paso1, /AVISO_NOMBRE_TORNEO_PRUEBA/);
    assert.match(AVISO_NOMBRE_TORNEO_PRUEBA, /test/);
  });
});
