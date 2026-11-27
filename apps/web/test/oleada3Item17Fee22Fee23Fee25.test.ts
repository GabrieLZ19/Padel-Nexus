import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { textoResumenCheckoutMp } from "../utils/resumenCheckoutMp.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Oleada 3 ítem 17 — FEE-23 CRM inscripciones", () => {
  it("reemplaza N/A por Sin costo", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/dashboard/inscripciones/page.tsx"),
      "utf8",
    );
    assert.match(page, /Sin costo/);
    assert.doesNotMatch(page, /esGratuito \? "N\/A"/);
  });
});

describe("Oleada 3 ítem 17 — FEE-25 Mis torneos", () => {
  it("expone precioInscripcion y esGratis al flujo de pago", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/torneos/page.tsx"),
      "utf8",
    );
    assert.match(page, /precioInscripcion=\{inscripcion\.precioInscripcion\}/);
    assert.match(page, /esGratis=\{inscripcion\.esGratis\}/);
  });

  it("InscripcionPagoActions pide confirmación antes de MP", () => {
    const cmp = readFileSync(
      path.join(RAIZ, "components/torneos/InscripcionPagoActions.tsx"),
      "utf8",
    );
    assert.match(cmp, /FeedbackModal/);
    assert.match(cmp, /Confirmar pago con Mercado Pago/);
    assert.match(cmp, /abrirConfirmacionMp/);
  });

  it("resumen de checkout incluye cargo por servicio", () => {
    const texto = textoResumenCheckoutMp(
      {
        monto_bruto: 10000,
        cargo_servicio: 500,
        modo_fee: "sumar",
        monto: 10500,
      },
      10000,
    );
    assert.match(texto, /Inscripción: \$10\.000/);
    assert.match(texto, /Cargo por servicio: \$500/);
    assert.match(texto, /Total a pagar: \$10\.500/);
  });
});