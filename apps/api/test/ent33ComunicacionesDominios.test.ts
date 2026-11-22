import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  esHostFrontendPadelNexus,
  normalizarActionUrl,
} from "../src/utils/comunicacionesActionUrl.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("ENT-33 comunicaciones — dominios propios del frontend", () => {
  it("reconoce subdominios padelnexus.app y legacy netlify", () => {
    assert.equal(esHostFrontendPadelNexus("play.padelnexus.app"), true);
    assert.equal(esHostFrontendPadelNexus("www.padelnexus.app"), true);
    assert.equal(esHostFrontendPadelNexus("app.padelnexus.app"), true);
    assert.equal(esHostFrontendPadelNexus("padelnexus.app"), true);
    assert.equal(esHostFrontendPadelNexus("padelnexus.netlify.app"), true);
    assert.equal(esHostFrontendPadelNexus("ejemplo.com"), false);
  });

  it("normaliza URLs propias a ruta relativa", () => {
    assert.equal(
      normalizarActionUrl("https://play.padelnexus.app/ranking"),
      "/ranking",
    );
    assert.equal(
      normalizarActionUrl("https://www.padelnexus.app/torneos"),
      "/torneos",
    );
    assert.equal(
      normalizarActionUrl("https://app.padelnexus.app/marketplace"),
      "/marketplace",
    );
    assert.equal(normalizarActionUrl("/ranking"), "/ranking");
    assert.equal(
      normalizarActionUrl("https://google.com/foo"),
      "https://google.com/foo",
    );
  });

  it("placeholder del panel sin netlify viejo", () => {
    const panel = readFileSync(
      path.join(RAIZ, "apps/web/components/comunicaciones/ComunicacionesPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /play\.padelnexus\.app\/ranking/);
    assert.doesNotMatch(panel, /padelnexus\.netlify\.app\/ranking/);
  });
});