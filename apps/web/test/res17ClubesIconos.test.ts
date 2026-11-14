import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-17 iconos en listado de clubes", () => {
  it("CheckCircle2 y MapPin con shrink-0 y alineación superior", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/dashboard/clubes/page.tsx"),
      "utf8",
    );
    assert.match(page, /CheckCircle2[\s\S]*shrink-0[\s\S]*self-start/);
    assert.match(page, /MapPin[\s\S]*shrink-0[\s\S]*self-start/);
    assert.match(page, /flex flex-wrap items-start/);
    assert.match(page, /flex items-start gap-1\.5 text-sm text-gray-400/);
  });
});
