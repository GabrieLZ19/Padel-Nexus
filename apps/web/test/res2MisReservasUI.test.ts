import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-2 · Mis reservas tras cancelación del club", () => {
  it("excluye canceladas de Próximas y agrupa en Pasadas / Canceladas", () => {
    const src = readFileSync(
      path.join(RAIZ, "app/(public)/mi-perfil/reservas/page.tsx"),
      "utf8",
    );
    assert.match(src, /estado_reserva !== "cancelada"/);
    assert.match(src, /Pasadas \/ Canceladas/);
    assert.match(src, /!isCancelled && reserva\.estado_pago === "pendiente"/);
  });
});
