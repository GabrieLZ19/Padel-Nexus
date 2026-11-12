"use client";

import { useCallback, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { identificadorPareceDni } from "@/utils/identificadorJugadorManual";
import { sileo } from "sileo";
import type { AltaLlavePreparada } from "./llaveAltaParejaTypes";

type ModoAlta = "externa" | "manual";

type ResultadoBusqueda = Awaited<
  ReturnType<typeof TorneosService.buscarParejasLlaveExternas>
>[number];

export function LlaveAltaParejaPanel({
  torneoId,
  esNacional,
  motivoAuditoria,
  slotDestino,
  categoriaTorneo,
  onInscripcionPreparada,
}: {
  torneoId: string;
  esNacional: boolean;
  motivoAuditoria: string;
  slotDestino: "a" | "b";
  categoriaTorneo?: string | null;
  onInscripcionPreparada: (datos: AltaLlavePreparada) => void;
}) {
  const [modo, setModo] = useState<ModoAlta>("externa");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionExterna, setSeleccionExterna] = useState("");
  const [j1, setJ1] = useState("");
  const [j2, setJ2] = useState("");
  const [j1Nombre, setJ1Nombre] = useState("");
  const [j1Apellido, setJ1Apellido] = useState("");
  const [j1Categoria, setJ1Categoria] = useState("");
  const [j1Nacimiento, setJ1Nacimiento] = useState("");
  const [j1Telefono, setJ1Telefono] = useState("");
  const [j2Nombre, setJ2Nombre] = useState("");
  const [j2Apellido, setJ2Apellido] = useState("");
  const [j2Categoria, setJ2Categoria] = useState("");
  const [j2Nacimiento, setJ2Nacimiento] = useState("");
  const [j2Telefono, setJ2Telefono] = useState("");
  const [letraPrioridad, setLetraPrioridad] = useState("");
  const [guardando, setGuardando] = useState(false);

  const categoriaDef = (categoriaTorneo || "").trim();
  const mostrarDatosJ1 = identificadorPareceDni(j1);
  const mostrarDatosJ2 = identificadorPareceDni(j2);

  const armarDatosAlta = (
    identificador: string,
    nombre: string,
    apellido: string,
    categoria: string,
    nacimiento: string,
    telefono: string,
  ) => {
    if (!identificadorPareceDni(identificador)) return undefined;
    const cat = categoria.trim() || categoriaDef;
    const payload = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      ...(cat ? { categoria_padel: cat } : {}),
      ...(nacimiento.trim() ? { fecha_nacimiento: nacimiento.trim() } : {}),
      ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
    };
    if (!payload.nombre && !payload.apellido) return undefined;
    return payload;
  };

  const validarMotivo = () => {
    if (motivoAuditoria.trim().length < 10) {
      sileo.warning({
        title: "Motivo obligatorio",
        description:
          "Completá el motivo de auditoría (mínimo 10 caracteres) antes de dar de alta la pareja.",
      });
      return false;
    }
    if (esNacional && !letraPrioridad.trim()) {
      sileo.warning({
        title: "Letra requerida",
        description: "En torneos nacionales indicá la letra de prioridad.",
      });
      return false;
    }
    return true;
  };

  const ejecutarBusqueda = useCallback(async () => {
    const q = busqueda.trim();
    if (q.length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const lista = await TorneosService.buscarParejasLlaveExternas(
        torneoId,
        q,
      );
      setResultados(lista);
    } catch {
      setResultados([]);
      sileo.error({ title: "No se pudo buscar parejas en otros torneos." });
    } finally {
      setBuscando(false);
    }
  }, [busqueda, torneoId]);

  const prepararAlta = () => {
    if (!validarMotivo()) return;

    if (modo === "externa") {
      const row = resultados.find(
        (r) => r.inscripcion_origen_id === seleccionExterna,
      );
      if (!row) {
        sileo.warning({
          title: "Elegí una pareja",
          description: "Seleccioná una pareja de la lista.",
        });
        return;
      }
      if (row.bloqueada_en_torneo) {
        sileo.warning({
          title: "Ya está en este torneo",
          description:
            row.motivo_bloqueo ||
            "Esos jugadores ya están inscriptos en este torneo.",
        });
        return;
      }
    }

    setGuardando(true);
    try {
      const tempId = `pending-alta-${crypto.randomUUID()}`;
      const letra = letraPrioridad.trim()
        ? { letra_prioridad: letraPrioridad.trim() }
        : {};

      if (modo === "externa") {
        const row = resultados.find(
          (r) => r.inscripcion_origen_id === seleccionExterna,
        );
        if (!row) return;
        const j2n =
          row.jugador2_nombre && row.jugador2_nombre !== "-"
            ? row.jugador2_nombre
            : null;
        const label = j2n ? `${row.jugador1_nombre} / ${j2n}` : row.jugador1_nombre;

        onInscripcionPreparada({
          tempId,
          label,
          name1: row.jugador1_nombre,
          name2: j2n,
          payload: {
            modo: "externa",
            inscripcion_origen_id: seleccionExterna,
            ...letra,
          },
        });
      } else {
        const j1nom = j1Nombre.trim() || "Jugador 1";
        const j1ape = j1Apellido.trim();
        const j2nom = j2Nombre.trim();
        const j2ape = j2Apellido.trim();
        const labelJ1 = j1ape ? `${j1ape.toUpperCase()}, ${j1nom}` : j1nom;
        const labelJ2 =
          j2.trim() && j2ape
            ? `${j2ape.toUpperCase()}, ${j2nom || "Jugador 2"}`
            : j2nom && j2ape
              ? `${j2ape.toUpperCase()}, ${j2nom}`
              : null;
        const label = labelJ2 ? `${labelJ1} / ${labelJ2}` : labelJ1;

        onInscripcionPreparada({
          tempId,
          label,
          name1: labelJ1,
          name2: labelJ2,
          payload: {
            modo: "manual",
            jugador1_identificador: j1.trim(),
            jugador2_identificador: j2.trim() || undefined,
            jugador1_datos: armarDatosAlta(
              j1,
              j1Nombre,
              j1Apellido,
              j1Categoria,
              j1Nacimiento,
              j1Telefono,
            ),
            jugador2_datos: armarDatosAlta(
              j2,
              j2Nombre,
              j2Apellido,
              j2Categoria,
              j2Nacimiento,
              j2Telefono,
            ),
            ...letra,
          },
        });
      }

      sileo.success({
        title: "Pareja lista para el cruce",
        description: `Quedará inscripta al guardar el partido (lado ${slotDestino.toUpperCase()}).`,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-chartreuse/20 bg-brand-chartreuse/5 p-3 space-y-3">
      <p className="text-xs text-gray-300 leading-relaxed">
        Si la pareja no está en este torneo, buscala en otra categoría o
        cargala por DNI. La inscripción se confirma al{" "}
        <span className="text-brand-chartreuse font-bold">guardar el partido</span>{" "}
        en el lado{" "}
        <span className="text-brand-chartreuse font-bold">
          {slotDestino.toUpperCase()}
        </span>
        .
      </p>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setModo("externa")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
            modo === "externa"
              ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
              : "bg-white/5 text-gray-400 border-white/10"
          }`}
        >
          Otro torneo
        </button>
        <button
          type="button"
          onClick={() => setModo("manual")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
            modo === "manual"
              ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
              : "bg-white/5 text-gray-400 border-white/10"
          }`}
        >
          Alta por DNI
        </button>
      </div>

      {esNacional && (
        <input
          type="text"
          value={letraPrioridad}
          onChange={(e) => setLetraPrioridad(e.target.value)}
          placeholder="Letra de prioridad (nacional)"
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
        />
      )}

      {modo === "externa" ? (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ejecutarBusqueda();
              }}
              placeholder="Nombre, apellido o DNI"
              className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              disabled={buscando}
              onClick={() => void ejecutarBusqueda()}
              className="shrink-0 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:text-white disabled:opacity-40"
            >
              <Search className="size-4" />
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1">
            {resultados.length === 0 ? (
              <p className="text-[11px] text-brand-ayuda px-1">
                {busqueda.trim().length < 2
                  ? "Escribí al menos 2 caracteres."
                  : buscando
                    ? "Buscando…"
                    : "Sin resultados en el club o grupo."}
              </p>
            ) : (
              resultados.map((row) => (
                <button
                  key={row.inscripcion_origen_id}
                  type="button"
                  disabled={row.bloqueada_en_torneo}
                  onClick={() =>
                    setSeleccionExterna(row.inscripcion_origen_id)
                  }
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] border ${
                    row.bloqueada_en_torneo
                      ? "border-amber-500/30 bg-amber-500/5 text-gray-500 cursor-not-allowed"
                      : seleccionExterna === row.inscripcion_origen_id
                        ? "border-brand-chartreuse/50 bg-brand-chartreuse/10 text-white"
                        : "border-white/8 bg-black/20 text-gray-300 hover:border-white/20"
                  }`}
                >
                  {row.etiqueta}
                  {row.bloqueada_en_torneo ? (
                    <span className="block text-[10px] text-amber-400/90 mt-0.5">
                      {row.motivo_bloqueo || "Ya en este torneo"}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            disabled={guardando || !seleccionExterna}
            onClick={() => prepararAlta()}
            className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-chartreuse text-brand-black disabled:opacity-40"
          >
            Preparar en lado {slotDestino.toUpperCase()}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            value={j1}
            onChange={(e) => setJ1(e.target.value)}
            placeholder="Jugador 1: email o DNI"
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
          />
          {mostrarDatosJ1 && (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={j1Apellido}
                onChange={(e) => setJ1Apellido(e.target.value)}
                placeholder="Apellido J1"
                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
              />
              <input
                value={j1Nombre}
                onChange={(e) => setJ1Nombre(e.target.value)}
                placeholder="Nombre J1"
                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
              />
              <input
                value={j1Categoria}
                onChange={(e) => setJ1Categoria(e.target.value)}
                placeholder="Categoría J1"
                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
              />
              <input
                value={j1Telefono}
                onChange={(e) => setJ1Telefono(e.target.value)}
                placeholder="Teléfono J1"
                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
              />
            </div>
          )}
          <input
            type="text"
            value={j2}
            onChange={(e) => setJ2(e.target.value)}
            placeholder="Jugador 2: email o DNI (opcional)"
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
          />
          {mostrarDatosJ2 && (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={j2Apellido}
                onChange={(e) => setJ2Apellido(e.target.value)}
                placeholder="Apellido J2"
                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
              />
              <input
                value={j2Nombre}
                onChange={(e) => setJ2Nombre(e.target.value)}
                placeholder="Nombre J2"
                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
              />
              <input
                value={j2Categoria}
                onChange={(e) => setJ2Categoria(e.target.value)}
                placeholder={
                  categoriaTorneo
                    ? `Categoría J2 (def. ${categoriaTorneo})`
                    : "Categoría J2"
                }
                className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white col-span-2"
              />
            </div>
          )}
          <button
            type="button"
            disabled={guardando || !j1.trim()}
            onClick={() => prepararAlta()}
            className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-chartreuse text-brand-black disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <UserPlus className="size-3.5" />
            Preparar alta en lado {slotDestino.toUpperCase()}
          </button>
        </>
      )}
    </div>
  );
}
