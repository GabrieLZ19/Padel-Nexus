import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  montoLicenciaDesdeSolicitud,
  textoInstruccionesPagoLicencia,
} from "../src/utils/licenciaPago.ts";
import { isMercadoPagoConfigured } from "../src/config/mercadopago.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("ENT-4 pago licencia (MP o transferencia)", () => {
  it("montoLicenciaDesdeSolicitud usa precio mensual cuando corresponde", () => {
    assert.equal(
      montoLicenciaDesdeSolicitud({
        frecuencia_pago: "mensual",
        precio_mensual: 2500,
        precio_anual: 30000,
      }),
      2500,
    );
    assert.equal(
      montoLicenciaDesdeSolicitud({
        frecuencia_pago: "anual",
        precio_anual: 30000,
      }),
      30000,
    );
  });

  it("instrucciones de transferencia incluyen monto y referencia", () => {
    const texto = textoInstruccionesPagoLicencia({
      monto: 30000,
      nroLicencia: "PAD-ABC123",
      alias: "FAP.LICENCIAS",
      cbu: "0000003100010000000001",
      titular: "FAP",
    });
    assert.match(texto, /30\.000/);
    assert.match(texto, /PAD-ABC123/);
    assert.match(texto, /FAP\.LICENCIAS/);
  });

  it("con APP_USR en entorno reconoce Mercado Pago configurado", () => {
    const token = process.env.MP_ACCESS_TOKEN?.trim();
    if (token?.startsWith("APP_USR-")) {
      assert.equal(isMercadoPagoConfigured(), true);
    } else {
      assert.ok(typeof isMercadoPagoConfigured() === "boolean");
    }
  });

  it("crearPreferenciaPago usa Preference de MP cuando hay token", () => {
    const src = fuente("apps/api/src/services/licencia.service.ts");
    const inicio = src.indexOf("static async crearPreferenciaPago");
    const fin = src.indexOf("static async confirmarPagoLicencia", inicio);
    assert.ok(inicio >= 0 && fin > inicio);
    const bloque = src.slice(inicio, fin);
    assert.match(bloque, /if \(!isMercadoPagoConfigured\(\)\)/);
    assert.match(bloque, /new MercadoPagoConfig/);
    assert.match(bloque, /preference\.create/);
    assert.match(bloque, /initPoint:/);
    const idxMp = bloque.indexOf("new MercadoPagoConfig");
    const idxAlt = bloque.indexOf("pagoAlternativo: true");
    assert.ok(idxAlt < idxMp, "pago alternativo solo aplica sin MP");
  });

  it("crearPreferenciaPago expone alternativa sin auto-mock en producción", () => {
    const src = fuente("apps/api/src/services/licencia.service.ts");
    assert.match(src, /permitirMockMercadoPagoLicencia/);
    assert.match(src, /pagoAlternativo:\s*true/);
    assert.match(src, /montoLicenciaDesdeSolicitud/);
  });

  it("web: panel de pago y retorno MP en Mi perfil", () => {
    const perfil = fuente("apps/web/app/(public)/mi-perfil/page.tsx");
    const panel = fuente("apps/web/components/perfil/LicenciaPagoPanel.tsx");
    const service = fuente("apps/web/utils/services/licencias.ts");

    assert.match(perfil, /LicenciaPagoPanel/);
    assert.match(perfil, /confirmarRetornoMp/);
    assert.match(panel, /Pagar con Mercado Pago/);
    assert.match(panel, /transferencia/);
    assert.match(service, /crearPreferenciaMp/);
    assert.match(service, /cotizar/);
  });

  it("modal de solicitud muestra cotización", () => {
    const modal = fuente("apps/web/components/perfil/LicenciaModal.tsx");
    assert.match(modal, /LicenciasService\.cotizar/);
    assert.match(modal, /Mercado Pago/);
  });
});
