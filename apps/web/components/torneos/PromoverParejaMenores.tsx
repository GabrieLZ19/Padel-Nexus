"use client";

import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { TorneosService } from "@/utils/services/torneos";

type Opciones = Awaited<
  ReturnType<typeof TorneosService.opcionesPromocionMenores>
>;

export function PromoverParejaMenores({
  torneoId,
  onMoved,
}: {
  torneoId: string;
  onMoved: () => void;
}) {
  const [opciones, setOpciones] = useState<Opciones | null>(null);
  const [parejaId, setParejaId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [hueco, setHueco] = useState("nuevo");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await TorneosService.opcionesPromocionMenores(torneoId);
      setOpciones(data);
    } catch {
      setOpciones(null);
    }
  }, [torneoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!opciones) return null;
  if (
    !opciones.habilitado &&
    opciones.motivo === "El pase entre categorías es solo para menores."
  ) {
    return null;
  }

  const destino = opciones.destinos.find((item) => item.id === destinoId);
  const huecos = [
    { value: "nuevo", label: "Crear partido en la primera ronda" },
    ...(destino?.byes || []).map((bye) => ({
      value: `${bye.partidoId}|${bye.lado}`,
      label: `Bye contra ${bye.rival}`,
    })),
  ];

  const confirmar = async () => {
    if (!parejaId || !destinoId || !motivo.trim()) return;
    const [partidoDestinoId, lado] =
      hueco === "nuevo" ? [null, null] : hueco.split("|");
    setGuardando(true);
    try {
      const resultado = await TorneosService.promoverParejaMenores(torneoId, {
        inscripcion_id: parejaId,
        torneo_destino_id: destinoId,
        partido_destino_id: partidoDestinoId,
        lado: lado === "a" || lado === "b" ? lado : null,
        motivo: motivo.trim(),
      });
      sileo.success({
        title: resultado.mensaje || "Pareja pasada a la categoría superior.",
      });
      setMotivo("");
      setParejaId("");
      await cargar();
      onMoved();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
      };
      sileo.error({
        title:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "No se pudo pasar la pareja.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-brand-card p-4 sm:p-5 space-y-3">
      <div>
        <h4 className="text-sm font-black uppercase tracking-wide text-brand-white">
          Pasar a categoría superior
        </h4>
        <p className="text-xs text-brand-ayuda mt-1 max-w-2xl">
          Sacá una pareja de esta llave: el rival queda con bye. En la
          categoría superior entra en un bye libre o, si no hay, en un partido
          nuevo de la primera ronda. El motivo queda en auditoría.
        </p>
      </div>
      {!opciones.habilitado ? (
        <p className="text-xs text-brand-ayuda">{opciones.motivo}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <CustomDropdown
            value={parejaId}
            onChange={setParejaId}
            placeholder="Pareja a pasar"
            options={opciones.parejas.map((pareja) => ({
              value: pareja.inscripcionId,
              label: `${pareja.nombre} · ${pareja.ronda}`,
            }))}
          />
          <CustomDropdown
            value={destinoId}
            onChange={(id) => {
              setDestinoId(id);
              setHueco("nuevo");
            }}
            placeholder="Categoría superior"
            options={opciones.destinos.map((item) => ({
              value: item.id,
              label: `${item.categoria || item.nombre}`,
            }))}
          />
          <CustomDropdown
            value={hueco}
            onChange={setHueco}
            placeholder="Dónde entra"
            disabled={!destinoId}
            options={huecos}
          />
          <input
            type="text"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Motivo del pase"
            className="w-full rounded-xl border border-white/10 bg-brand-input px-3 py-2.5 text-sm text-brand-white placeholder:text-brand-ayuda"
          />
          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              disabled={guardando || !parejaId || !destinoId || !motivo.trim()}
              onClick={() => void confirmar()}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-brand-chartreuse text-brand-black disabled:opacity-40"
            >
              {guardando ? "Pasando…" : "Pasar pareja"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
