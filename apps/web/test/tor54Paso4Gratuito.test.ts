import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  inscripcionCuentaComoConfirmada,
  inscripcionPagoPendienteBloqueaCuadro,
  torneoInscripcionSinCosto,
} from "../utils/torneoInscripcionSinCosto.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-54 Paso 4 torneo gratuito", () => {
  it("helpers de torneo gratuito", () => {
    assert.equal(
      torneoInscripcionSinCosto({ es_gratis: true, precio_inscripcion: 1 }),
      true,
    );
    assert.equal(inscripcionCuentaComoConfirmada({ estado_pago: "Confirmado" }), true);
    assert.equal(
      inscripcionPagoPendienteBloqueaCuadro(
        { estado_pago: "Pendiente" },
        { es_gratis: true, precio_inscripcion: 0 },
      ),
      false,
    );
  });

  it("Paso4 muestra confirmación y no oculta el checkbox en gratuitos", () => {
    const paso4 = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso4Jugadores.tsx"),
      "utf8",
    );
    assert.match(paso4, /inscripcionCuentaComoConfirmada/);
    assert.doesNotMatch(
      paso4,
      /!gratuito && ins\.estado_pago === "Confirmado"/,
    );
    assert.match(paso4, /Pendiente de confirmar/);
  });

  it("Paso8 no bloquea generar cuadros por pago en torneo gratuito", () => {
    const paso8 = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso8Cuadros.tsx"),
      "utf8",
    );
    assert.match(paso8, /inscripcionPagoPendienteBloqueaCuadro/);
  });
});