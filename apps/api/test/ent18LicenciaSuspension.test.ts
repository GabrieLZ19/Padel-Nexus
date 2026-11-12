import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("ENT-18 suspender licencia — motivo, auditoría y notificación", () => {
  it("API exige motivo y registra auditoría al suspender", () => {
    const servicio = readFileSync(
      path.join(RAIZ, "api/src/services/licencia.service.ts"),
      "utf8",
    );
    const controlador = readFileSync(
      path.join(RAIZ, "api/src/controllers/licencia.controller.ts"),
      "utf8",
    );
    const rutas = readFileSync(
      path.join(RAIZ, "api/src/routes/licencia.routes.ts"),
      "utf8",
    );
    assert.match(servicio, /motivo de la suspensión/);
    assert.match(servicio, /suspender_licencia/);
    assert.match(servicio, /logs_auditoria/);
    assert.match(servicio, /Motivo: \$\{motivoSuspension\}/);
    assert.match(controlador, /motivo/);
    assert.match(rutas, /historial/);
  });

  it("CRM pide motivo antes de suspender", () => {
    const listado = readFileSync(
      path.join(RAIZ, "web/app/dashboard/jugadores/page.tsx"),
      "utf8",
    );
    const ficha = readFileSync(
      path.join(RAIZ, "web/app/dashboard/jugadores/[id]/page.tsx"),
      "utf8",
    );
    assert.match(listado, /inputType="textarea"/);
    assert.match(listado, /Motivo \(obligatorio\)/);
    assert.match(ficha, /Historial de licencia/);
    assert.match(ficha, /getHistorial/);
  });
});
