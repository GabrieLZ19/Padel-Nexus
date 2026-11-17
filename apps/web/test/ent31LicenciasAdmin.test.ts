import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-31 licencias admin", () => {
  it("mensaje claro al suspender licencia", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/dashboard/jugadores/page.tsx"),
      "utf8",
    );
    assert.match(
      page,
      /La licencia quedó suspendida\. Podés reactivarla cuando corresponda\./,
    );
  });

  it("registrar pago notifica al padre y toast", () => {
    const historial = readFileSync(
      path.join(RAIZ, "components/licencias/LicenciaPagosHistorial.tsx"),
      "utf8",
    );
    assert.match(historial, /onPagoRegistrado/);
    assert.match(historial, /title: "Pago registrado"/);

    const card = readFileSync(
      path.join(RAIZ, "components/licencias/LicenciaJugadorCard.tsx"),
      "utf8",
    );
    assert.match(card, /onPagoRegistrado=\{onPagoRegistrado\}/);

    const listado = readFileSync(
      path.join(RAIZ, "app/dashboard/jugadores/page.tsx"),
      "utf8",
    );
    assert.match(listado, /handlePagoRegistrado/);
    assert.match(listado, /onPagoRegistrado=\{handlePagoRegistrado\}/);
  });
});