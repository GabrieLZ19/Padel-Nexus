import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ_API = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("RNK-3 ranking por rama", () => {
  it("obtenerRankingGlobal filtra perfiles.sexo cuando viene rama", () => {
    const svc = readFileSync(
      path.join(RAIZ_API, "src/services/ranking.service.ts"),
      "utf8",
    );
    const bloque = svc.match(
      /static async obtenerRankingGlobal[\s\S]*?^  \}/m,
    )?.[0];
    assert.ok(bloque);
    assert.match(bloque, /normalizarRama\(rama\)/);
    assert.match(bloque, /query\.eq\("perfiles\.sexo", ramaNormalizada\)/);
  });
});