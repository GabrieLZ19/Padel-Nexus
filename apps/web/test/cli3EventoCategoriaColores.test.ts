import assert from "node:assert/strict";
import test from "node:test";
import { colorCategoriaEvento } from "../utils/eventoCategoriaColores";

test("colorCategoriaEvento asigna color estable por orden del evento", () => {
  const ids = ["a", "b", "c"];
  assert.equal(colorCategoriaEvento("a", ids), colorCategoriaEvento("a", ids));
  assert.notEqual(colorCategoriaEvento("a", ids), colorCategoriaEvento("b", ids));
});