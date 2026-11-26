import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RNK-4 UI ranking — selector de clubes", () => {
  it("visitantes usan clubes con ranking y sin preseleccion", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/ranking/page.tsx"),
      "utf8",
    );
    assert.match(page, /getClubesRankingPublico/);
    assert.doesNotMatch(page, /ClubesService\.getAll/);
    assert.match(
      page,
      /setActiveClubId\(\(prev\) => \(prev && lista\.some\(\(c\) => c\.id === prev\) \? prev : ""\)\)/,
    );
  });

  it("servicio frontend expone rankings/clubes", () => {
    const svc = readFileSync(
      path.join(RAIZ, "utils/services/rankings.ts"),
      "utf8",
    );
    assert.match(svc, /\/rankings\/clubes/);
    assert.match(svc, /getClubesRankingPublico/);
  });
});