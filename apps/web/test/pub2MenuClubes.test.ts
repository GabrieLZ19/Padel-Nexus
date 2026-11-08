import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuente(relativo: string): string {
  return readFileSync(path.join(WEB, relativo), "utf8");
}

describe("PUB-2 menú Clubes", () => {
  it("no expone ítem Clubes en el navbar público (listado no requerido)", () => {
    const navbar = fuente("components/layout/Navbar.tsx");
    assert.equal(navbar.includes('path: "/clubes"'), false);
    assert.equal(navbar.includes('name: "Clubes"'), false);
  });
});
