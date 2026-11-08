import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("RES-10 comunicaciones del club — audiencia inicial", () => {
  it("admin_club arranca en jugadores_club", () => {
    const util = readFileSync(
      path.join(RAIZ, "web/utils/comunicacionesAudienciaDefault.ts"),
      "utf8",
    );
    assert.match(util, /admin_club.*jugadores_club/s);

    const panel = readFileSync(
      path.join(RAIZ, "web/components/comunicaciones/ComunicacionesPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /audienciaInicialSegunRol/);
    assert.match(panel, /debeRealinearAudienciaClub/);
    assert.match(panel, /setClubIds\(\[profileClubId\]\)/);
  });
});
