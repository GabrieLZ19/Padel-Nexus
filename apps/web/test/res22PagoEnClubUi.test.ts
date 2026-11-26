import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-22 UI pago en el club", () => {
  it("checkout no envía monto al confirmar pago manual", () => {
    const checkout = readFileSync(
      path.join(WEB, "app/(public)/reservar/checkout/[reserva_id]/page.tsx"),
      "utf8",
    );
    assert.match(checkout, /ReservasService\.pagarReserva/);
    assert.doesNotMatch(checkout, /monto:\s*reserva\.turnos\.precio/);
    assert.match(checkout, /metodo_pago:\s*metodoPago/);
  });

  it("club y mis reservas etiquetan pendiente_en_club", () => {
    const club = readFileSync(
      path.join(WEB, "app/club/reservas/page.tsx"),
      "utf8",
    );
    assert.match(club, /pendiente_en_club:\s*"Cobrar en el club"/);

    const mis = readFileSync(
      path.join(WEB, "app/(public)/mi-perfil/reservas/page.tsx"),
      "utf8",
    );
    assert.match(mis, /pendiente_en_club/);
    assert.match(mis, /Pago en el club/);
  });
});