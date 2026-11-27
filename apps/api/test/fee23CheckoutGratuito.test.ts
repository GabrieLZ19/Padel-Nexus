import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-23 checkout MP en torneos gratuitos", () => {
  it("preview y preferencia devuelven 400 controlado en el controller", () => {
    const ctrl = readFileSync(
      path.join(API, "src/controllers/inscripcion.controller.ts"),
      "utf8",
    );
    const preview = ctrl.slice(
      ctrl.indexOf("export const previewCheckoutMercadoPagoInscripcion"),
      ctrl.indexOf("export const crearPreferenciaPagoInscripcion"),
    );
    const preferencia = ctrl.slice(
      ctrl.indexOf("export const crearPreferenciaPagoInscripcion"),
      ctrl.indexOf("export const confirmarRetornoPagoInscripcion"),
    );
    assert.match(preview, /res\.status\(400\)/);
    assert.doesNotMatch(preview, /res\.status\(500\)/);
    assert.match(preferencia, /res\.status\(400\)/);
    assert.doesNotMatch(preferencia, /res\.status\(500\)/);
  });

  it("assertUsuarioPuedePagarInscripcion rechaza torneo sin costo", () => {
    const svc = readFileSync(
      path.join(API, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(svc, /torneoInscripcionSinCosto\(torneo\)/);
    assert.match(svc, /MENSAJE_TORNEO_INSCRIPCION_SIN_COSTO/);
  });

  it("panel jugador usa torneoInscripcionSinCosto", () => {
    const panel = readFileSync(
      path.join(API, "src/services/panelJugador.service.ts"),
      "utf8",
    );
    assert.match(panel, /torneoInscripcionSinCosto/);
    assert.match(panel, /precioInscripcion/);
    assert.match(panel, /esGratis/);
  });
});