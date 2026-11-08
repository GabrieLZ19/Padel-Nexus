import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { normalizarCanales } from "../src/services/comunicaciones-canales.service.ts";
import { sumarEntrega, metricasVacias } from "../src/services/comunicaciones-metricas.service.ts";

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

  it("envio expone canales, forzarInApp y endpoints de retencion", () => {
    const envio = fuente("apps/api/src/services/comunicaciones.service.ts");
    assert.match(envio, /canales/);
    assert.match(envio, /forzarInApp: true/);

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
