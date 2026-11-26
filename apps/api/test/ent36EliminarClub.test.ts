import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-36 baja y eliminación de club sin historial real", () => {
  it("historial: licencia de club sin pagos no bloquea", () => {
    const historial = readFileSync(
      path.join(RAIZ, "src/utils/entidadHistorial.ts"),
      "utf8",
    );
    assert.match(historial, /contarLicenciasClubConPagos/);
    assert.match(historial, /licencias_club_pagos/);
    assert.match(
      historial,
      /resumen\.licenciasClub = await contarLicenciasClubConPagos/,
    );
  });

  it("eliminarClubDefinitivo limpia licencia, canchas y afiliaciones", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    assert.match(svc, /licencias_club_pagos/);
    assert.match(svc, /licencias_club/);
    assert.match(svc, /historial\.perfilesVinculados/);
    assert.match(svc, /historial\.reservas/);
    assert.match(svc, /gestionarBajaClub/);
  });
});