import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-11 notificaciones y toasts", () => {
  it("panel de notificaciones sin typo notificaciónes", () => {
    const notif = readFileSync(
      path.join(RAIZ, "components/notificaciones/NotificationCenter.tsx"),
      "utf8",
    );
    assert.match(notif, /notificaciones en total/);
    assert.doesNotMatch(notif, /notificaciónes/i);
  });

  it("toasts sileo desactivan capitalize en títulos", () => {
    const layout = readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");
    const styles = readFileSync(path.join(RAIZ, "utils/sileoStyles.ts"), "utf8");
    assert.match(layout, /sileoToastStyles/);
    assert.match(layout, /SILEO_TOAST_DURATION_MS/);
    assert.match(styles, /!normal-case/);
  });

  it("guardar perfil usa toast autodesvanecible, no modal de éxito", () => {
    const ajustes = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/ajustes/page.tsx"),
      "utf8",
    );
    assert.match(ajustes, /toastExito/);
    assert.match(ajustes, /Ficha actualizada/);
    assert.doesNotMatch(ajustes, /Ficha Actualizada/);
    assert.doesNotMatch(ajustes, /showModal/);
  });

  it("checkout reserva sin títulos en Title Case", () => {
    const checkout = readFileSync(
      path.join(RAIZ, "app/(public)/reservar/checkout/[reserva_id]/page.tsx"),
      "utf8",
    );
    const prohibidos = [
      "Pago Fallido",
      "Pago Pendiente",
      "Referencia Requerida",
      "Comprobante Requerido",
      "Error de Acreditación",
    ];
    for (const frase of prohibidos) {
      assert.equal(checkout.includes(frase), false, frase);
    }
  });

  it("ejemplos QA en copy de fiscal", () => {
    const fiscales = readFileSync(
      path.join(RAIZ, "app/dashboard/fiscales/page.tsx"),
      "utf8",
    );
    assert.match(fiscales, /title: "Fiscal registrado"/);
    assert.doesNotMatch(fiscales, /Fiscal Registrado/);
  });
});
