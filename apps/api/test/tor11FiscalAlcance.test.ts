import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  fiscalHabilitadoParaTorneo,
  mensajeFiscalInhabilParaTorneo,
  minimoFiscalParaAlcanceTorneo,
} from "../src/utils/fiscalAlcance.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("TOR-11 fiscal provincial en torneo nacional", () => {
  it("exige rango Nacional para torneo Nacional", () => {
    assert.equal(minimoFiscalParaAlcanceTorneo("Nacional"), 4);
    assert.equal(fiscalHabilitadoParaTorneo("Nacional", "Nacional"), true);
    assert.equal(fiscalHabilitadoParaTorneo("Nacional", "Provincial"), false);
    assert.equal(fiscalHabilitadoParaTorneo("Nacional", "Regional"), false);
  });

  it("torneo Provincial admite fiscal Provincial o Nacional", () => {
    assert.equal(fiscalHabilitadoParaTorneo("Provincial", "Provincial"), true);
    assert.equal(fiscalHabilitadoParaTorneo("Provincial", "Nacional"), true);
    assert.equal(fiscalHabilitadoParaTorneo("Provincial", "Regional"), false);
  });

  it("mensaje de rechazo cita alcance del torneo y rango del fiscal", () => {
    const msg = mensajeFiscalInhabilParaTorneo("Nacional", "Provincial");
    assert.match(msg, /Nacional/);
    assert.match(msg, /Provincial/);
  });

  it("backend valida rango al asignar fiscales al torneo", () => {
    const svc = fuente("apps/api/src/services/fiscal.service.ts");
    assert.match(svc, /fiscalHabilitadoParaTorneo/);
    assert.match(svc, /mensajeFiscalInhabilParaTorneo/);
  });

  it("Paso6Fiscales oculta designación si rango es insuficiente", () => {
    const paso = fuente("apps/web/components/torneos/wizard/Paso6Fiscales.tsx");
    assert.match(paso, /fiscalHabilitadoParaTorneo/);
    assert.match(paso, /puedeDesignar/);
    assert.match(
      paso,
      /puedeDesignar \? \([\s\S]*Confirmar designación/,
    );
  });
});
