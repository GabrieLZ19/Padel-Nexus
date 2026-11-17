import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizarNombreClub } from "../src/services/club.service.ts";

describe("TOR-40 clubes y sedes", () => {
  it("normalizarNombreClub ignora mayúsculas y espacios", () => {
    assert.equal(
      normalizarNombreClub("  QA Prueba – Sede 16-11  "),
      normalizarNombreClub("qa prueba – sede 16-11"),
    );
  });
});