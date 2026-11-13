import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

describe("ENT-21 · historial de licencia", () => {
  it("registra reactivación y cambio de vencimiento con autor", () => {
    const svc = readFileSync(
      path.join(DIR, "../src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /reactivar_licencia/);
    assert.match(svc, /cambiar_vencimiento_licencia/);
    assert.match(svc, /admin_nombre/);
    assert.match(svc, /esReactivacion/);
    assert.match(svc, /esAprobacionInicial/);
    assert.match(svc, /estadoEfectivoPrevio/);
    assert.match(svc, /titulo: "Licencia reactivada"/);
    assert.match(svc, /titulo: "Licencia aprobada"/);
  });

  it("fecha latina con hora en util backend", () => {
    const fechas = readFileSync(
      path.join(DIR, "../src/utils/fechaArgentina.ts"),
      "utf8",
    );
    assert.match(fechas, /fechaHoraLatinaArgentina/);
  });
});
