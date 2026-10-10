import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resumenColumnasLlave, zoomAjustadoAlAncho } from "../utils/medidaLlave";

/** Llave de 16: octavos, cuartos, semifinales y final. */
const LLAVE_16 = [
  49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 64,
];

describe("llave al ancho de la pantalla", () => {
  it("una llave de 16 tiene cuatro rondas y entra en 1366 sin barra horizontal", () => {
    const resumen = resumenColumnasLlave(LLAVE_16);
    assert.equal(resumen.columnas, 4);
    assert.deepEqual(resumen.nombres, [
      "Octavos de final",
      "Cuartos de final",
      "Semifinales",
      "Final",
    ]);
    assert.equal(resumen.ancho, 1484);

    const sidebar = 288;
    const paddingPagina = 80;
    const paddingPanel = 48;
    const margenAjuste = 8;
    const disponible = 1366 - sidebar - paddingPagina - paddingPanel;
    const zoom = zoomAjustadoAlAncho(resumen.ancho, disponible - margenAjuste);

    assert.ok(zoom < 1);
    assert.ok(resumen.ancho * zoom <= disponible);
  });
});
