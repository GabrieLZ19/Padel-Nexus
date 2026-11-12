import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("RES-13 comunicaciones club — copy sin detalle técnico", () => {
  it("ComunicacionesPanel no menciona Resend ni fase 2 en la UI", () => {
    const panel = readFileSync(
      path.join(RAIZ, "web/components/comunicaciones/ComunicacionesPanel.tsx"),
      "utf8",
    );
    assert.equal(panel.includes("Resend"), false);
    assert.equal(/fase\s*2/i.test(panel), false);
    assert.match(panel, /WhatsApp todavía no está disponible/);
  });
});
