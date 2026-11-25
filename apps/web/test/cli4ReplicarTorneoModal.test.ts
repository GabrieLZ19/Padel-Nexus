import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { previewNombreTorneoReplicado } from "../utils/replicarTorneoNombre.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-4 modal replicar torneo", () => {
  it("preview de nombre alineado al backend", () => {
    const nombre = previewNombreTorneoReplicado(
      "Evento Test — 7a Fem.",
      "7a",
      "Femenina",
      "6a",
      "Masculina",
    );
    assert.equal(nombre, "Evento Test — 6a Masc.");
  });

  it("modal expone ramas y envía ramas al replicar (club y CRM)", () => {
    const modal = readFileSync(
      path.join(RAIZ, "components/torneos/ReplicarTorneoModal.tsx"),
      "utf8",
    );
    assert.match(modal, /RAMAS_PADEL/);
    assert.match(modal, /ramas: ramasPayload/);
    assert.doesNotMatch(modal, /modoClub/);
    const clubPage = readFileSync(
      path.join(RAIZ, "app/club/torneos/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(clubPage, /modoClub/);
  });
});