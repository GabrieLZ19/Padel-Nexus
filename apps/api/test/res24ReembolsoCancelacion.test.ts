import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-24 cancelación cobrada y reintegro", () => {
  it("gestionarReservaClub exige motivo y marca reembolso_pendiente", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    assert.match(svc, /motivoRaw\.length < 8/);
    assert.match(svc, /reembolso_pendiente/);
    assert.match(svc, /accion === "reembolsar"/);
    assert.match(svc, /estado_pago: "reembolsado"/);
  });
});