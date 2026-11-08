import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { textoJugadorVisible } from "../utils/formatFecha.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-8 · nombres en programación fiscal", () => {
  it("textoJugadorVisible devuelve texto (no boolean) para UI", () => {
    assert.equal(textoJugadorVisible("García, Juan"), "García, Juan");
    assert.equal(textoJugadorVisible("  López  "), "López");
    assert.equal(textoJugadorVisible("Libre"), null);
    assert.equal(textoJugadorVisible("-"), null);
  });

  it("ParejaCruceInteractiva usa textoJugadorVisible para mostrar nombres", () => {
    const src = readFileSync(
      path.join(RAIZ, "app/dashboard/fiscal/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(src, /textoJugadorVisible\(j1\)/);
    assert.match(src, /textoJugadorVisible\(j2\)/);
    assert.doesNotMatch(
      src,
      /const nombre1 = nombreJugadorVisible\(j1\)/,
      "no debe usar el boolean como etiqueta",
    );
  });
});
