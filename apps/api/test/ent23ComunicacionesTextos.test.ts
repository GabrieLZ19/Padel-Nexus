import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  motivoOmitidoDesdeResultado,
  estadoDestinatarioCampana,
} from "../src/utils/comunicacionesOmitidos.ts";
import {
  metricasVacias,
  registrarResultadoCanal,
  sumarOmitidoConMotivo,
} from "../src/services/comunicaciones-metricas.service.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("ENT-23 textos de campañas", () => {
  it("preserva motivo de omitido en metricas", () => {
    let m = metricasVacias();
    m = registrarResultadoCanal(m, "email", "omitido_config");
    assert.equal(m.omitidos.email, 1);
    assert.equal(m.omitidos_motivo?.email?.no_configurado, 1);
    m = sumarOmitidoConMotivo(m, "email", "sin_dato");
    assert.equal(m.omitidos.email, 2);
    assert.equal(m.omitidos_motivo?.email?.sin_dato, 1);
  });

  it("destinatario guarda estado distinto por motivo", () => {
    assert.equal(estadoDestinatarioCampana("omitido_sin_dato"), "omitido_sin_dato");
    assert.equal(estadoDestinatarioCampana("omitido_config"), "omitido_config");
    assert.equal(motivoOmitidoDesdeResultado("omitido_prefs"), "prefs");
  });

  it("UI usa canales legibles, motivos y remitente sin rol tecnico", () => {
    const panel = fuente("apps/web/components/comunicaciones/ComunicacionesPanel.tsx");
    assert.match(panel, /etiquetasCanalesLegibles/);
    assert.match(panel, /remitenteCampanaLegible/);
    assert.doesNotMatch(panel, /remitenteRol/);
    const metricas = fuente("apps/web/utils/comunicacionesMetricasCampana.ts");
    assert.match(metricas, /correo no configurado/);
    const envio = fuente("apps/api/src/services/comunicaciones.service.ts");
    assert.match(envio, /entidad_remitente: etiquetaEntidad/);
    assert.match(envio, /registrarResultadoCanal/);
  });
});
