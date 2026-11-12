import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-15 panel club: notificaciones en desktop", () => {
  it("NotificationCenter visible en lg (sidebar) además del header móvil", () => {
    const layout = readFileSync(
      path.join(RAIZ, "app/club/layout.tsx"),
      "utf8",
    );
    assert.match(layout, /NotificationCenter/);
    assert.match(layout, /hidden lg:flex/);
    assert.match(layout, /lg:hidden.*NotificationCenter|NotificationCenter[\s\S]*lg:hidden/);
  });
});
