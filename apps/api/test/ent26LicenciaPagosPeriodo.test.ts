import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_MONO = path.resolve(RAIZ_API, "../..");

describe("ENT-26 período de pago de licencia", () => {
  it("migración admite YYYY anual y YYYY-MM mensual", () => {
    const sql = readFileSync(
      path.join(
        RAIZ_MONO,
        "supabase/migrations/20261113210000_ent26_licencia_pagos_periodo_anual.sql",
      ),
      "utf8",
    );
    assert.match(sql, /periodo ~ '\^\\d\{4\}\(-\\d\{2\}\)\?\$'/);
  });

  it("registrarPago mapea violación del check de período", () => {
    const src = readFileSync(
      path.join(RAIZ_API, "src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(src, /licencia_pagos_periodo_check/);
    assert.match(src, /licencias anuales usá el año AAAA/);
  });

  it("toasts sileo quedan por encima del modal de feedback", () => {
    const css = readFileSync(
      path.join(RAIZ_MONO, "apps/web/app/globals.css"),
      "utf8",
    );
    assert.match(css, /\[data-sileo-viewport\][\s\S]*z-index:\s*300/);
  });
});
