import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { MENSAJE_TORNEO_INSCRIPCION_SIN_COSTO } from "../src/utils/inscripcionElegibilidad.ts";

const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Fase 3 item 15 — TOR-59, TOR-60, FEE-22/23", () => {
  it("TOR-59 texto de auditoría en Paso Resultados", () => {
    const paso = fs.readFileSync(
      path.join(API, "../web/components/torneos/wizard/Paso9Arbitraje.tsx"),
      "utf8",
    );
    assert.match(paso, /Paso 6 Cuadros > pestaña Auditoría/);
  });

  it("TOR-60 POST inscripción toma nombres desde perfiles", () => {
    const svc = fs.readFileSync(
      path.join(API, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(svc, /nombreJ1Persistido = formatNombreCompleto/);
    assert.match(svc, /jugador1_nombre: nombreJ1Persistido/);
    assert.match(svc, /select\([\s\S]*apellido/);
  });

  it("FEE-23 torneo gratuito sin checkout MP", () => {
    assert.match(
      MENSAJE_TORNEO_INSCRIPCION_SIN_COSTO,
      /no tiene costo de inscripción/i,
    );
    const svc = fs.readFileSync(
      path.join(API, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(svc, /torneo_sin_costo: true/);
    assert.match(svc, /MENSAJE_TORNEO_INSCRIPCION_SIN_COSTO/);
  });
});