import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { debeMostrarDesgloseFee } from "../utils/checkoutFee";

describe("FEE-10 debeMostrarDesgloseFee", () => {
  it("muestra desglose solo con modo sumar y fee > 0", () => {
    assert.equal(
      debeMostrarDesgloseFee({
        monto_bruto: 1000,
        cargo_servicio: 50,
        modo_fee: "sumar",
        monto: 1050,
      }),
      true,
    );
    assert.equal(
      debeMostrarDesgloseFee({
        monto_bruto: 1000,
        cargo_servicio: 0,
        modo_fee: "sumar",
        monto: 1000,
      }),
      false,
    );
    assert.equal(
      debeMostrarDesgloseFee({
        monto_bruto: 1000,
        cargo_servicio: 50,
        modo_fee: "absorber",
        monto: 1000,
      }),
      false,
    );
  });
});