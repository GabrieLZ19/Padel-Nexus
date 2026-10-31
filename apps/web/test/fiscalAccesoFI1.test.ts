import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  esRolFiscal,
  esRolAccesoCrm,
  destinoPostLogin,
} from "../utils/auth/roles";

function leerArchivo(subpath: string): string {
  const p1 = path.resolve(subpath);
  if (fs.existsSync(p1)) return fs.readFileSync(p1, "utf8");
  const p2 = path.resolve("apps/web", subpath);
  if (fs.existsSync(p2)) return fs.readFileSync(p2, "utf8");
  throw new Error(`No se encontró el archivo: ${subpath}`);
}

describe("FI1 - Acceso a Fiscales y Rol Fiscal en Gestión de Usuarios (Frontend)", () => {
  it("Gestión de Usuarios incluye el rol 'fiscal' en ROLES_CREABLES, ROL_LABELS y ROL_COLORS", () => {
    const code = leerArchivo("app/dashboard/usuarios/page.tsx");
    assert.ok(
      code.includes('{ value: "fiscal", label: "Fiscal" }'),
      "ROLES_CREABLES debe incluir { value: 'fiscal', label: 'Fiscal' }",
    );
    assert.ok(
      code.includes('fiscal: "Fiscal"'),
      "ROL_LABELS debe incluir la etiqueta legible para fiscal",
    );
    assert.ok(
      code.includes('fiscal: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"'),
      "ROL_COLORS debe incluir estilo visual para fiscal",
    );
  });

  it("Colegio de Fiscales tiene botón visible 'Crear acceso' en la celda de la tabla cuando no tiene usuario", () => {
    const code = leerArchivo("app/dashboard/fiscales/page.tsx");
    assert.ok(
      code.includes("Crear acceso"),
      "Debe existir el texto 'Crear acceso' visible para el usuario",
    );
    assert.ok(
      code.includes("<KeyRound"),
      "Debe incluir icono KeyRound para identificar la accion de credenciales",
    );
  });

  it("Colegio de Fiscales permite generar credenciales inmediatamente al registrar un fiscal", () => {
    const code = leerArchivo("app/dashboard/fiscales/page.tsx");
    assert.ok(
      code.includes("crearAccesoInmediato"),
      "Debe existir la opcion crearAccesoInmediato en el formulario de alta",
    );
    assert.ok(
      code.includes("Generar credenciales de acceso de inmediato"),
      "Debe mostrar el checkbox explicativo para el admin",
    );
  });

  it("esRolFiscal y destinoPostLogin envían al fiscal al dashboard", () => {
    assert.strictEqual(esRolFiscal("fiscal"), true);
    assert.strictEqual(esRolAccesoCrm("fiscal"), true);
    assert.strictEqual(destinoPostLogin("fiscal"), "/dashboard");
  });
});
