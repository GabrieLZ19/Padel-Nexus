import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Ola 3 — frontend ranking público", () => {
  it("servicios: contextos, clubes, rama y scopes", () => {
    const svc = readFileSync(
      path.join(RAIZ, "utils/services/rankings.ts"),
      "utf8",
    );
    assert.match(svc, /mis-contextos/);
    assert.match(svc, /mis-clubes/);
    assert.match(svc, /AlcanceRankingPublico = "Club"/);
    assert.match(svc, /club_id\?: string/);
    assert.match(svc, /rama\?:/);
  });

  it("página /ranking: sin Global, con rama y club", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/ranking/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(page, /"Global"/);
    assert.match(page, /RankingsService\.getMisClubes/);
    assert.match(page, /filtrosCompletos/);
    assert.match(page, /activeRama/);
  });
});