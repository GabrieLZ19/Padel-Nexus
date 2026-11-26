import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferirSemillaPaseDirectoEnSpec,
  ladoClasificadoPaseDirectoProtegido,
  puedeUsarAltaParejaEnSlot,
} from "../utils/fapPaseDirectoLlave.ts";

describe("TOR-22 pase directo en modal de llave", () => {
  const specCuarto = { a: "1A", b: "W16" };

  it("inferir semilla en cuarto 1A vs Gan. #16", () => {
    assert.equal(inferirSemillaPaseDirectoEnSpec(specCuarto), "1A");
  });

  it("protege el lado del clasificado con semilla_fap", () => {
    assert.equal(
      ladoClasificadoPaseDirectoProtegido(specCuarto, "1A", "a"),
      true,
    );
    assert.equal(
      ladoClasificadoPaseDirectoProtegido(specCuarto, "1A", "b"),
      false,
    );
  });

  it("habilita alta solo en el lado rival (W*) con semilla", () => {
    const bloqueado = (ref: string) => ref.startsWith("W");
    assert.equal(
      puedeUsarAltaParejaEnSlot(specCuarto, "1A", "a", bloqueado),
      false,
    );
    assert.equal(
      puedeUsarAltaParejaEnSlot(specCuarto, "1A", "b", bloqueado),
      true,
    );
    assert.equal(
      puedeUsarAltaParejaEnSlot(specCuarto, null, "b", bloqueado),
      true,
    );
  });

  it("sin patrón pase directo bloquea alta en huecos Gan.", () => {
    const spec = { a: "W16", b: "W17" };
    const bloqueado = (ref: string) => ref.startsWith("W");
    assert.equal(puedeUsarAltaParejaEnSlot(spec, null, "a", bloqueado), false);
    assert.equal(puedeUsarAltaParejaEnSlot(spec, null, "b", bloqueado), false);
  });

  it("bloquea lado del clasificado sin semilla_fap explícita en octavo", () => {
    const specOctavo = { a: "1A", b: "W50" };
    const bloqueado = (ref: string) => ref.startsWith("W");
    assert.equal(
      puedeUsarAltaParejaEnSlot(specOctavo, null, "a", bloqueado),
      false,
    );
    assert.equal(
      puedeUsarAltaParejaEnSlot(specOctavo, null, "b", bloqueado),
      true,
    );
  });
});