import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contarOrdenesCobradasDesdeFilas,
  contarUnidadesCobradasDesdeFilas,
} from "../src/utils/marketplaceVentasCobradas.ts";

describe("MKT-2 ventas cobradas", () => {
  it("cuenta solo ordenes pagada o entregada (sin pendiente)", () => {
    const filas = [
      { orden_id: "a", estado: "pendiente" },
      { orden_id: "b", estado: "pagada" },
      { orden_id: "b", estado: "pagada" },
      { orden_id: "c", estado: "entregada" },
      { orden_id: "d", estado: "cancelada" },
    ];
    assert.equal(contarOrdenesCobradasDesdeFilas(filas), 2);
  });

  it("unidades cobradas ignoran pendientes y canceladas", () => {
    const filas = [
      { estado: "pendiente", cantidad: 2 },
      { estado: "pagada", cantidad: 1 },
      { estado: "pagada", cantidad: 3 },
      { estado: "cancelada", cantidad: 9 },
    ];
    assert.equal(contarUnidadesCobradasDesdeFilas(filas), 4);
  });
});