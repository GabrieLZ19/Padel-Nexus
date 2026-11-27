import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { repararTextoFffdLatin1 } from "../src/utils/repararTextoFffdLatin1.ts";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("ENT-42 migración y reparación U+FFFD en padrón", () => {
  it("migración SQL mapea U+FFFD y solo toca fichas provisorias", () => {
    const sql = readFileSync(
      path.join(raiz, "supabase/migrations/20261127120000_ent42_sanear_acentos_padron.sql"),
      "utf8",
    );
    assert.match(sql, /ent42_sanear_fffd_en_texto/);
    assert.match(sql, /U&'\\FFFD'/);
    assert.match(sql, /pendiente_activacion = true/);
    assert.match(sql, /solo-sanear/);
    assert.match(sql, /Entre Ríos/);
    assert.doesNotMatch(sql, /WHERE[\s\S]*pendiente_activacion = false/);
  });

  it("repararTextoFffdLatin1 corrige patrones frecuentes del padrón", () => {
    assert.equal(repararTextoFffdLatin1("Mu\uFFFDoz"), "Muñoz");
    assert.equal(repararTextoFffdLatin1("Neuqu\uFFFDn, Neuqu\uFFFDn"), "Neuquén, Neuquén");
    assert.equal(repararTextoFffdLatin1("Garc\uFFFDa"), "García");
    assert.equal(
      repararTextoFffdLatin1("Paran\uFFFD, Entre Rios"),
      "Paraná, Entre Rios",
    );
  });
});