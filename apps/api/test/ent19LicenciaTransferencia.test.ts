import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolverDatosTransferenciaLicencia,
  textoInstruccionesPagoLicencia,
  transferenciaLicenciaDisponible,
} from "../src/utils/licenciaPago.ts";

const DIR = path.dirname(fileURLToPath(import.meta.url));

describe("ENT-19 · transferencia licencia alias/CBU", () => {
  it("prioriza alias y CBU de la config de organización", () => {
    const config = {
      pagoAlias: "fap.licencias",
      pagoCbu: "0000003100010000000001",
      pagoTitular: "FAP Cobros",
    };
    const datos = resolverDatosTransferenciaLicencia(config);
    assert.equal(datos.alias, "fap.licencias");
    assert.equal(datos.cbu, "0000003100010000000001");
    assert.equal(datos.titular, "FAP Cobros");
    assert.equal(transferenciaLicenciaDisponible(datos), true);
  });

  it("instrucciones incluyen alias y CBU cuando existen", () => {
    const txt = textoInstruccionesPagoLicencia({
      monto: 30000,
      nroLicencia: "PAD-ABC",
      alias: "fap.licencias",
      cbu: "0000003100010000000001",
      titular: "Federación Argentina de Pádel",
    });
    assert.match(txt, /Alias: fap\.licencias/);
    assert.match(txt, /CBU: 0000003100010000000001/);
  });

  it("expone GET datos-transferencia y columnas en config", () => {
    const routes = readFileSync(
      path.join(DIR, "../src/routes/licencia.routes.ts"),
      "utf8",
    );
    assert.match(routes, /datos-transferencia/);
    const org = readFileSync(
      path.join(DIR, "../src/services/licenciaOrganizacion.service.ts"),
      "utf8",
    );
    assert.match(org, /licencia_pago_alias/);
  });
});
