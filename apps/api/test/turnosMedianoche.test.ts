import assert from "node:assert/strict";
import { describe, it } from "node:test";

function toMinutes(hhmm: string): number {
  const [hh, mm] = hhmm.slice(0, 5).split(":").map(Number);
  return hh * 60 + mm;
}

function fromMinutes(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function calcularFinYDuracion(horaInicio: string, horaFin: string) {
  const startMin = toMinutes(horaInicio);
  const rawEndMin = toMinutes(horaFin);
  const endMin = rawEndMin <= startMin ? rawEndMin + 1440 : rawEndMin;
  const duracion = endMin - startMin;
  return { startMin, endMin, duracion };
}

function haySolapamiento(
  aInicio: string,
  aFin: string,
  bInicio: string,
  bFin: string,
): boolean {
  const a = calcularFinYDuracion(aInicio, aFin);
  const b = calcularFinYDuracion(bInicio, bFin);
  return a.startMin < b.endMin && a.endMin > b.startMin;
}

describe("Turnos que cruzan la medianoche", () => {
  it("calcula correctamente la duración de un turno de 23:00 a 00:30 (90 minutos)", () => {
    const { duracion, endMin } = calcularFinYDuracion("23:00", "00:30");
    assert.equal(duracion, 90);
    assert.equal(endMin, 1470);
  });

  it("calcula correctamente la duración de un turno de 23:30 a 01:00 (90 minutos)", () => {
    const { duracion } = calcularFinYDuracion("23:30", "01:00");
    assert.equal(duracion, 90);
  });

  it("calcula correctamente un turno que termina a la medianoche 23:00 a 00:00 (60 minutos)", () => {
    const { duracion } = calcularFinYDuracion("23:00", "00:00");
    assert.equal(duracion, 60);
  });

  it("detecta que un turno de 21:30 a 23:00 y uno de 23:00 a 00:30 NO se superponen", () => {
    const solapa = haySolapamiento("21:30", "23:00", "23:00", "00:30");
    assert.equal(solapa, false);
  });

  it("detecta que un turno de 22:30 a 23:30 y uno de 23:00 a 00:30 SÍ se superponen", () => {
    const solapa = haySolapamiento("22:30", "23:30", "23:00", "00:30");
    assert.equal(solapa, true);
  });

  it("un bloqueo de 23:00 a 00:30 solapa con el turno de 23:00 a 00:30", () => {
    const solapa = haySolapamiento("23:00", "00:30", "23:00", "00:30");
    assert.equal(solapa, true);
  });

  it("un bloqueo de 22:00 a 23:30 solapa parcialmente con el turno de 23:00 a 00:30", () => {
    const solapa = haySolapamiento("23:00", "00:30", "22:00", "23:30");
    assert.equal(solapa, true);
  });

  it("un bloqueo de 18:00 a 20:00 no solapa con el turno de 23:00 a 00:30", () => {
    const solapa = haySolapamiento("23:00", "00:30", "18:00", "20:00");
    assert.equal(solapa, false);
  });

  it("fromMinutes formatea 1470 minutos como '00:30' y no '24:30'", () => {
    assert.equal(fromMinutes(1470), "00:30");
    assert.equal(fromMinutes(1440), "00:00");
    assert.equal(fromMinutes(1380), "23:00");
  });
});
