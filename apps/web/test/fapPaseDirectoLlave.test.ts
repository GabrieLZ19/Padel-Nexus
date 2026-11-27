import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferirSemillaPaseDirectoEnSpec,
  ladoClasificadoPaseDirectoProtegido,
  puedeUsarAltaParejaEnSlot,
  slotPermiteAltaPaseDirecto,
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

  it("con matriz FAP: cuarto 1A vs Gan. #16 permite alta solo en lado B", () => {
    const matrix = [
      { matchNo: 16, a: "1A", b: "2B" },
      { matchNo: 19, a: "1A", b: "W16" },
    ];
    const spec = matrix[1];
    const bloqueado = (ref: string) => ref.startsWith("W");
    const ctx = { matrix, matchOrden: 19 };
    assert.equal(
      puedeUsarAltaParejaEnSlot(spec, "1A", "a", bloqueado, ctx),
      false,
    );
    assert.equal(
      puedeUsarAltaParejaEnSlot(spec, "1A", "b", bloqueado, ctx),
      true,
    );
  });

  it("con matriz: Gan. #16 vs 3C no ofrece alta (Gan. #17 / feeder sin pase directo)", () => {
    const matrix = [
      { matchNo: 16, a: "1A", b: "2B" },
      { matchNo: 19, a: "W16", b: "3C" },
    ];
    const spec = matrix[1];
    const bloqueado = (ref: string) => ref.startsWith("W");
    const ctx = { matrix, matchOrden: 19 };
    assert.equal(
      puedeUsarAltaParejaEnSlot(spec, null, "a", bloqueado, ctx),
      false,
    );
    assert.equal(slotPermiteAltaPaseDirecto(spec, matrix, 19, "a", null), false);
    assert.equal(slotPermiteAltaPaseDirecto(spec, matrix, 19, "a", "3C"), false);
  });

  it("coherencia octavo 1A vs W50: alta solo en el partido de entrada", () => {
    const matrix = [
      { matchNo: 50, a: "3A", b: "2B" },
      { matchNo: 57, a: "1A", b: "W50" },
      { matchNo: 61, a: "W57", b: "W58" },
    ];
    const bloqueado = (ref: string) => ref.startsWith("W");
    assert.equal(
      puedeUsarAltaParejaEnSlot(matrix[1], "1A", "b", bloqueado, {
        matrix,
        matchOrden: 57,
      }),
      true,
    );
    assert.equal(
      puedeUsarAltaParejaEnSlot(matrix[2], null, "a", bloqueado, {
        matrix,
        matchOrden: 61,
      }),
      false,
    );
  });
});