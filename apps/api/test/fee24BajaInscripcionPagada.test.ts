import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { FAP_ESTADOS_PAGO } from "../src/constants/fap.ts";
import {
  inscripcionActivaNoCancelada,
  inscripcionRequiereBajaAuditablePagada,
} from "../src/utils/inscripcionElegibilidad.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-24 baja auditable y reintegro", () => {
  it("migración agrega columnas de cancelación y reintegro", () => {
    const sql = readFileSync(
      path.join(
        RAIZ,
        "../../supabase/migrations/20261127130000_fee24_baja_inscripcion_pagada_reembolso.sql",
      ),
      "utf8",
    );
    assert.match(sql, /cancelada boolean not null default false/);
    assert.match(sql, /estado_reembolso/);
    assert.match(sql, /pendiente.*devuelto/s);
  });

  it("inscripcionRequiereBajaAuditablePagada solo para organizador con pago", () => {
    const torneo = { es_gratis: false, precio_inscripcion: 5000 };
    const ins = {
      usuario_id: "j1",
      usuario2_id: "j2",
      estado_pago: FAP_ESTADOS_PAGO.CONFIRMADO,
    };
    assert.equal(
      inscripcionRequiereBajaAuditablePagada(
        { id: "admin", rol: "admin" },
        ins,
        torneo,
      ),
      true,
    );
    assert.equal(
      inscripcionRequiereBajaAuditablePagada(
        { id: "j1", rol: "usuario" },
        ins,
        torneo,
      ),
      false,
    );
    assert.equal(inscripcionActivaNoCancelada({ cancelada: true }), false);
  });

  it("cancelarInscripcion persiste baja lógica y marcarReembolsoInscripcion", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(svc, /estado_reembolso: "pendiente"/);
    assert.match(svc, /motivo de al menos 8 caracteres/);
    assert.match(svc, /static async marcarReembolsoInscripcion/);
    assert.match(svc, /cancelada: true/);
    assert.match(svc, /\.eq\("cancelada", false\)/);
  });

  it("rutas PATCH reembolsar y DELETE con motivo", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/inscripcion.routes.ts"),
      "utf8",
    );
  assert.match(routes, /\/:id\/reembolsar/);
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/inscripcion.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /reembolsarInscripcion/);
    assert.match(ctrl, /motivo_cancelacion/);
  });
});