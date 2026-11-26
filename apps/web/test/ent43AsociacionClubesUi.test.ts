import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-43 UI clubes afiliados", () => {
  it("muestra canchas_activas y estado del club", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/dashboard/asociaciones/[id]/page.tsx"),
      "utf8",
    );
    assert.match(page, /canchas_activas/);
    assert.match(page, /String\(c\.estado/);
  });
});