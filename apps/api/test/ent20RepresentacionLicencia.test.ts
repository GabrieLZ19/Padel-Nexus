import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

describe("ENT-20 · perfil con asociación de licencia", () => {
  it("obtenerPerfilCompleto enlaza asociaciones en licencias", () => {
    const src = readFileSync(
      path.join(DIR, "../src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(
      src,
      /licencias:licencias!fk_licencias_usuario\(\*, asociaciones:asociacion_id/,
    );
  });
});
