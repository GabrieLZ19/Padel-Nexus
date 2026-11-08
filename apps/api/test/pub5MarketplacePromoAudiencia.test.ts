import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  MARKETPLACE_ENTIDAD_TIPOS,
  puedeAudienciaPromocionPlataforma,
} from "../src/constants/marketplace.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-5 marketplace promociones — sin broadcast para club", () => {
  it("solo federación puede usar audiencia plataforma", () => {
    assert.equal(
      puedeAudienciaPromocionPlataforma(MARKETPLACE_ENTIDAD_TIPOS.FEDERACION),
      true,
    );
    assert.equal(
      puedeAudienciaPromocionPlataforma(MARKETPLACE_ENTIDAD_TIPOS.CLUB),
      false,
    );
    assert.equal(
      puedeAudienciaPromocionPlataforma(MARKETPLACE_ENTIDAD_TIPOS.ASOCIACION),
      false,
    );
  });

  it("enviarPromocionEntidad valida audiencia plataforma antes del fan-out", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/marketplace.service.ts"),
      "utf8",
    );
    assert.match(svc, /puedeAudienciaPromocionPlataforma\(ref\.entidad_tipo\)/);
    assert.match(svc, /PLATAFORMA/);
    assert.match(svc, /Solo la federación puede enviar promociones a toda la plataforma/);
  });
});
