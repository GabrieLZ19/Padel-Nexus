import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PlatformFeeService } from "../src/services/platformFee.service";

describe("FEE-10 camposCheckoutApi", () => {
  it("expone monto_bruto, cargo_servicio, modo_fee y monto total", () => {
    const campos = PlatformFeeService.camposCheckoutApi({
      montoBruto: 10_000,
      montoFee: 500,
      montoTotal: 10_500,
      modo: "sumar",
      discriminadoEnCheckout: true,
    });
    assert.equal(campos.monto_bruto, 10_000);
    assert.equal(campos.cargo_servicio, 500);
    assert.equal(campos.modo_fee, "sumar");
    assert.equal(campos.monto, 10_500);
  });

  it("modo absorber mantiene total igual al bruto", () => {
    const campos = PlatformFeeService.camposCheckoutApi({
      montoBruto: 8_000,
      montoFee: 400,
      montoTotal: 8_000,
      modo: "absorber",
      discriminadoEnCheckout: false,
    });
    assert.equal(campos.monto, 8_000);
    assert.equal(campos.modo_fee, "absorber");
  });
});