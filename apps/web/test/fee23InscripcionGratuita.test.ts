import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ETIQUETA_INSCRIPCION_SIN_COSTO,
  torneoInscripcionSinCosto,
} from "../utils/torneoInscripcionSinCosto.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-23 textos y lógica de pago en torneos gratuitos", () => {
  it("no pide MP si es_gratis aunque el precio legacy sea > 0", () => {
    assert.equal(
      torneoInscripcionSinCosto({
        es_gratis: true,
        precio_inscripcion: 15000,
      }),
      true,
    );
  });

  it("inscripcionPago usa torneoInscripcionSinCosto", () => {
    const src = readFileSync(
      path.join(RAIZ, "utils/inscripcionPago.ts"),
      "utf8",
    );
    assert.match(src, /torneoInscripcionSinCosto/);
  });

  it("detalle público usa etiqueta de inscripción sin costo", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(page, /ETIQUETA_INSCRIPCION_SIN_COSTO/);
    assert.match(page, /torneoInscripcionSinCosto\(torneo\)/);
    assert.match(ETIQUETA_INSCRIPCION_SIN_COSTO, /sin costo/i);
  });
});