import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENZO-3 portada móvil", () => {
  it("HomePageClient usa ancho completo y buscador flexible desde 360px", () => {
    const home = readFileSync(
      path.join(RAIZ, "app/(public)/HomePageClient.tsx"),
      "utf8",
    );
    assert.match(home, /w-full min-w-0/);
    assert.match(home, /min-w-0 flex-1/);
    assert.match(home, /px-4/);
    assert.doesNotMatch(home, /max-w-\[80/);
  });
});
