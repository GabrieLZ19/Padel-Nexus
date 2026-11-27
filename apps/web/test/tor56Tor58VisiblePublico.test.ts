import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  esNombreTorneoDePrueba,
  torneoVisibleEnSitioPublico,
} from "../utils/datoPruebaTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-56 visibilidad desacoplada en web", () => {
  it("torneo visible con es_prueba true si visible_sitio_publico", () => {
    assert.equal(
      torneoVisibleEnSitioPublico({
        nombre: "Open Oficial",
        visible_sitio_publico: true,
      }),
      true,
    );
    assert.equal(
      torneoVisibleEnSitioPublico({
        nombre: "Open Oficial",
        visible_sitio_publico: false,
      }),
      false,
    );
  });

  it("auditoría en el nombre no fuerza ensayo si no hay palabra clave", () => {
    assert.equal(esNombreTorneoDePrueba("Copa Auditoría Municipal"), false);
  });

  it("TorneoModal no acopla ocultar con es_prueba", () => {
    const modal = readFileSync(
      path.join(RAIZ, "components/torneos/TorneoModal.tsx"),
      "utf8",
    );
    const bloqueOcultar = modal.match(
      /solicitarOcultarSitioPublico[\s\S]*?setFormData\(\{[\s\S]*?\}\);/,
    );
    assert.ok(bloqueOcultar);
    assert.doesNotMatch(bloqueOcultar![0], /es_prueba: true/);
  });
});