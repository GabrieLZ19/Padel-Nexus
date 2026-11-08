import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  campanaSponsorVencida,
  campanaSponsorVisiblePublico,
  estadoEfectivoCampanaSponsor,
  estadoPersistibleCampanaSponsor,
} from "../src/utils/sponsorCampanaVigencia.ts";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuenteApi(subpath: string): string {
  return readFileSync(path.join(RAIZ_API, subpath), "utf8");
}

describe("ENT-13 campaña sponsor vencida", () => {
  it("activa con fecha_fin pasada pasa a finalizada", () => {
    assert.equal(
      estadoEfectivoCampanaSponsor("activa", "2026-11-02", "2026-11-06"),
      "finalizada",
    );
    assert.equal(
      estadoPersistibleCampanaSponsor("activa", "2026-11-02", "2026-11-06"),
      "finalizada",
    );
    assert.equal(campanaSponsorVencida("2026-11-02", "2026-11-06"), true);
    assert.equal(campanaSponsorVencida("2026-11-06", "2026-11-06"), false);
  });

  it("no se muestra en público si el período terminó", () => {
    assert.equal(
      campanaSponsorVisiblePublico(
        "activa",
        "2026-10-26",
        "2026-11-02",
        "2026-11-06",
      ),
      false,
    );
    assert.equal(
      campanaSponsorVisiblePublico(
        "activa",
        "2026-10-26",
        "2026-11-08",
        "2026-11-06",
      ),
      true,
    );
  });

  it("listar campañas cierra vencidas en el servicio", () => {
    const svc = fuenteApi("src/services/marketplace.service.ts");
    assert.match(svc, /finalizarCampanasSponsorVencidas/);
    assert.match(svc, /await MarketplaceService\.finalizarCampanasSponsorVencidas/);
    assert.match(svc, /estadoPersistibleCampanaSponsor/);
  });
});
