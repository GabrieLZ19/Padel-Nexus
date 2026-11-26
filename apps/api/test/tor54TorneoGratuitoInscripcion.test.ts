import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { FAP_ESTADOS_PAGO } from "../src/constants/fap.ts";
import {
  estadoPagoInicialInscripcion,
  inscripcionPendientePagoBloqueaCuadro,
  torneoInscripcionSinCosto,
} from "../src/utils/inscripcionElegibilidad.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-54 inscripción manual en torneo gratuito", () => {
  it("detecta torneo sin costo por es_gratis o precio 0", () => {
    assert.equal(
      torneoInscripcionSinCosto({ es_gratis: true, precio_inscripcion: 5000 }),
      true,
    );
    assert.equal(
      torneoInscripcionSinCosto({ es_gratis: false, precio_inscripcion: 0 }),
      true,
    );
    assert.equal(
      torneoInscripcionSinCosto({ es_gratis: false, precio_inscripcion: 100 }),
      false,
    );
  });

  it("inscripción manual/admin en torneo gratuito queda Confirmado sin metodoPago", () => {
    const torneo = { es_gratis: true, precio_inscripcion: 0 };
    assert.equal(
      estadoPagoInicialInscripcion(torneo, undefined),
      FAP_ESTADOS_PAGO.CONFIRMADO,
    );
    assert.equal(
      estadoPagoInicialInscripcion(torneo, ""),
      FAP_ESTADOS_PAGO.CONFIRMADO,
    );
  });

  it("torneo de pago sigue en Pendiente hasta confirmar", () => {
    const torneo = { es_gratis: false, precio_inscripcion: 15000 };
    assert.equal(
      estadoPagoInicialInscripcion(torneo, undefined),
      FAP_ESTADOS_PAGO.PENDIENTE,
    );
    assert.equal(
      estadoPagoInicialInscripcion(torneo, "Efectivo"),
      FAP_ESTADOS_PAGO.CONFIRMADO,
    );
  });

  it("generar cuadros no bloquea por pago en torneo gratuito aunque el estado venga mal", () => {
    const torneo = { es_gratis: true, precio_inscripcion: 0 };
    assert.equal(
      inscripcionPendientePagoBloqueaCuadro(
        FAP_ESTADOS_PAGO.PENDIENTE,
        torneo,
      ),
      false,
    );
    assert.equal(
      inscripcionPendientePagoBloqueaCuadro(
        FAP_ESTADOS_PAGO.CONFIRMADO,
        { es_gratis: false, precio_inscripcion: 1000 },
      ),
      false,
    );
    assert.equal(
      inscripcionPendientePagoBloqueaCuadro(
        FAP_ESTADOS_PAGO.PENDIENTE,
        { es_gratis: false, precio_inscripcion: 1000 },
      ),
      true,
    );
  });

  it("servicio de inscripción usa estadoPagoInicialInscripcion", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(src, /estadoPagoInicialInscripcion\(torneo/);
    assert.match(src, /es_gratis/);
  });
});