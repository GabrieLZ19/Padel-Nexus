import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  exponeIdentidadVerificacionPublica,
  mensajeVerificacionLicenciaPublica,
} from "../src/utils/verificacionLicenciaPublica.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("ENT-24 licencia pendiente y QR público", () => {
  it("mensajes de trámite según pago", () => {
    assert.match(
      mensajeVerificacionLicenciaPublica("en_tramite", {
        estado_pago: "pendiente",
        precio_anual: 25000,
      }),
      /Pago pendiente/,
    );
    assert.match(
      mensajeVerificacionLicenciaPublica("en_tramite", { estado_pago: "pagado" }),
      /Pendiente de aprobación/,
    );
  });

  it("no expone identidad de menor en consulta pública aunque esté vigente", () => {
    assert.equal(exponeIdentidadVerificacionPublica(true, false), false);
    assert.equal(exponeIdentidadVerificacionPublica(true, true), true);
    assert.equal(exponeIdentidadVerificacionPublica(false, false), true);
  });

  it("listado CRM muestra pago pendiente y verificar en trámite", () => {
    const card = readFileSync(
      path.join(RAIZ, "apps/web/components/licencias/LicenciaJugadorCard.tsx"),
      "utf8",
    );
    assert.match(card, /Pago pendiente/);
    assert.match(card, /licenciaTienePagoPendiente/);
    const verificar = readFileSync(
      path.join(RAIZ, "apps/web/app/(public)/verificar/[usuarioId]/page.tsx"),
      "utf8",
    );
    assert.match(verificar, /en_tramite/);
    const svc = readFileSync(
      path.join(RAIZ, "apps/api/src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /mensajeVerificacionLicenciaPublica/);
    assert.match(svc, /es_menor/);
  });
});
