import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RNK-2 ranking público — Club | Provincial | Nacional", () => {
  it("la página envía scope Club con club_id y sin Global", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/ranking/page.tsx"),
      "utf8",
    );
    assert.match(page, /"Club", "Provincial", "Nacional"/);
    assert.match(page, /club_id:\s*activeScope === "Club"/);
    assert.doesNotMatch(page, /"Global"/);
    assert.match(page, /RankingsService\.getMisClubes/);
    assert.match(page, /getClubesRankingPublico/);
  });

  it("el servicio expone mis-clubes y club_id en query", () => {
    const svc = readFileSync(
      path.join(RAIZ, "utils/services/rankings.ts"),
      "utf8",
    );
    assert.match(svc, /\/rankings\/mis-clubes/);
    assert.match(svc, /club_id\?: string/);
    assert.match(svc, /AlcanceRankingPublico = "Club"/);
  });
});