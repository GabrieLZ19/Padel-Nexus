import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { normalizarCanales } from "../src/services/comunicaciones-canales.service.ts";
import {
  normalizarMetricasCampana,
  sumarEntrega,
  metricasVacias,
} from "../src/services/comunicaciones-metricas.service.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("ENT-7 canales y metricas de campaña (feature 20.0)", () => {
  it("normaliza canales y exige al menos in_app", () => {
    assert.deepEqual(normalizarCanales(["email", "whatsapp", "in_app"]), [
      "email",
      "whatsapp",
      "in_app",
    ]);
    assert.deepEqual(normalizarCanales([]), ["in_app"]);
  });

  it("metricas agregan entregas por canal", () => {
    let m = metricasVacias();
    m = sumarEntrega(m, "in_app", true);
    m = sumarEntrega(m, "email", false);
    assert.equal(m.entregados.in_app, 1);
    assert.equal(m.omitidos?.email, 1);
  });

  it("normaliza metricas en listado de campañas legacy", () => {
    const vacio = normalizarMetricasCampana(null, 8);
    assert.equal(vacio.entregados.in_app, 8);

    const envio = fuente("apps/api/src/services/comunicaciones.service.ts");
    assert.match(envio, /normalizarMetricasCampana/);
  });

  it("historial muestra entregas y omitidos por canal", () => {
    const util = fuente("apps/web/utils/comunicacionesMetricasCampana.ts");
    const panel = fuente("apps/web/components/comunicaciones/ComunicacionesPanel.tsx");
    assert.match(util, /omitido/);
    assert.match(util, /resumenMetricasCampana/);
    assert.match(panel, /resumenMetricasCampana/);
    assert.equal(panel.includes("RESEND_API_KEY"), false);
    assert.equal(panel.includes("Resend"), false);
    assert.equal(/fase\s*2/i.test(panel), false);
  });

  it("resend separa auth, campanas y flag de plan gratuito", () => {
    const recuperacion = fuente("apps/api/src/utils/recuperacionPasswordEmail.ts");
    const canales = fuente("apps/api/src/services/comunicaciones-canales.service.ts");
    const resendCfg = fuente("apps/api/src/utils/resendConfig.ts");
    assert.match(recuperacion, /resendFromAuth/);
    assert.match(canales, /campanaEmailHabilitado/);
    assert.match(canales, /Gestionar notificaciones/);
    assert.match(resendCfg, /RESEND_FROM_AUTH/);
    assert.match(resendCfg, /RESEND_CAMPANA_EMAIL_HABILITADO/);
  });

  it("envio expone canales y endpoints de retencion (ENT-25: sin forzar in-app)", () => {
    const envio = fuente("apps/api/src/services/comunicaciones.service.ts");
    assert.match(envio, /canales/);
    assert.doesNotMatch(envio, /forzarInApp:\s*true/);

    const notif = fuente("apps/api/src/services/notificacion.service.ts");
    assert.match(notif, /forzarInApp/);
    assert.match(notif, /registrarApertura/);

    const panel = fuente("apps/web/components/comunicaciones/ComunicacionesPanel.tsx");
    assert.match(panel, /Canales de envío/);
    assert.match(panel, /Aperturas:/);

    const routes = fuente("apps/api/src/routes/notificacion.routes.ts");
    assert.match(routes, /campana\/:id\/clic/);
  });
});
