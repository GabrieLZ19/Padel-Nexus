import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-48 fusión y transferencia Auth", () => {
  it("preservar acceso llama RPC antes de activar perfil y no silencia errores", () => {
    const fusion = readFileSync(
      path.join(RAIZ, "src/utils/fusionFichasJugador.ts"),
      "utf8",
    );
    const bloque = fusion.slice(
      fusion.indexOf("async function preservarAccesoOrigenEnDestino"),
      fusion.indexOf("export async function fusionarFichasJugador"),
    );
    const idxRpc = bloque.indexOf("transferir_credenciales_auth_fusion");
    const idxPerfil = bloque.indexOf(".from(\"perfiles\")");
    assert.ok(idxRpc >= 0 && idxPerfil > idxRpc);
    assert.match(bloque, /if \(rpcError\)/);
    assert.match(bloque, /telefonoDestino/);
  });
});