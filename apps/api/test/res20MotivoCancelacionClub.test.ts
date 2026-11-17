import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-20: motivo_cancelacion en listado club", () => {
  it("obtenerReservasClub incluye motivo_cancelacion", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    const bloque = src.match(
      /static async obtenerReservasClub\([\s\S]*?static async agendaReservasClub/,
    );
    assert.ok(bloque?.[0]);
    assert.match(bloque![0], /motivo_cancelacion/);
  });
});