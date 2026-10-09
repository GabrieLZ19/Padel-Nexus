"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Layers, X } from "lucide-react";
import { Torneo } from "@/utils/types";
import { TorneosService } from "@/utils/services/torneos";

interface AgruparTorneosModalProps {
  isOpen: boolean;
  nombreInicial: string;
  torneosFijos: Torneo[];
  clubId?: string;
  onClose: () => void;
  onSuccess: (nombre: string) => void;
  onError: (message: string) => void;
}

export default function AgruparTorneosModal({
  isOpen,
  nombreInicial,
  torneosFijos,
  clubId,
  onClose,
  onSuccess,
  onError,
}: AgruparTorneosModalProps) {
  const [nombre, setNombre] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [candidatos, setCandidatos] = useState<Torneo[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const firmaFijos = torneosFijos.map((torneo) => torneo.id).join(",");

  useEffect(() => {
    if (!isOpen) return;
    setNombre(nombreInicial);
    setSeleccionados([]);
    setBusqueda("");
  }, [isOpen, nombreInicial, firmaFijos]);

  useEffect(() => {
    if (!isOpen) return;
    let activo = true;
    TorneosService.getByPage(1, 40, busqueda, undefined, {
      vista: "todos",
      clubId,
    })
      .then((respuesta) => {
        if (activo) setCandidatos(respuesta.data || []);
      })
      .catch(() => {
        if (activo) setCandidatos([]);
      });
    return () => {
      activo = false;
    };
  }, [isOpen, busqueda, clubId]);

  if (!isOpen || torneosFijos.length === 0) return null;

  const idsFijos = torneosFijos.map((torneo) => torneo.id);
  const yaEnGrupo = new Set(idsFijos);
  const extras = candidatos.filter((candidato) => !yaEnGrupo.has(candidato.id));
  const sumandoAGrupo = idsFijos.length > 1;

  const alternar = (id: string) => {
    if (yaEnGrupo.has(id)) return;
    setSeleccionados((actual) =>
      actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id],
    );
  };

  const guardar = async (nombreGrupo: string = nombre) => {
    const ids = [...new Set([...idsFijos, ...seleccionados])];
    try {
      setGuardando(true);
      const grupo = await TorneosService.agrupar(nombreGrupo, ids);
      onSuccess(grupo.nombre || nombreGrupo);
      onClose();
    } catch (error: unknown) {
      const mensaje = isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error || "No se pudo agrupar la competencia."
        : "No se pudo agrupar la competencia.";
      onError(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold text-white">
              <Layers className="size-5 text-brand-chartreuse" />
              {sumandoAGrupo ? "Sumar a la competencia" : "Agrupar competencia"}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {sumandoAGrupo
                ? `Los torneos que marques se suman a «${nombreInicial}».`
                : "Los torneos quedan juntos y, adentro, separados por rama."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <label className="block text-sm font-medium text-gray-300">
            Nombre del grupo
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-brand-chartreuse/50"
            />
          </label>

          <label className="block text-sm font-medium text-gray-300">
            Sumar otros torneos
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-brand-chartreuse/50"
            />
          </label>

          {sumandoAGrupo && (
            <p className="text-xs text-gray-500">
              Ya están en el grupo: {torneosFijos.map((torneo) => torneo.nombre).join(", ")}
            </p>
          )}

          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {extras.map((candidato) => (
              <li key={candidato.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 px-3 py-2 hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(candidato.id)}
                    onChange={() => alternar(candidato.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      {candidato.nombre}
                    </span>
                    <span className="text-xs text-gray-500">
                      {candidato.rama || "Sin rama"} · {candidato.nivel || "Sin nivel"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/5 p-6">
          <button
            type="button"
            onClick={() => void guardar("")}
            disabled={guardando || idsFijos.length === 0}
            className="mr-auto cursor-pointer rounded-xl px-4 py-2 text-sm text-gray-400 hover:bg-white/5 disabled:opacity-60"
          >
            Quitar agrupación
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || !nombre.trim() || seleccionados.length === 0}
            className="cursor-pointer rounded-xl bg-brand-chartreuse px-4 py-2 text-sm font-bold text-brand-black disabled:opacity-60"
          >
            {guardando ? "Guardando..." : sumandoAGrupo ? "Sumar al grupo" : "Agrupar"}
          </button>
        </div>
      </div>
    </div>
  );
}
