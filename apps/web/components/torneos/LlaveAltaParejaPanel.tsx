"use client";

import { useCallback, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { identificadorPareceDni } from "@/utils/identificadorJugadorManual";
import { sileo } from "sileo";

type ModoAlta = "externa" | "manual";

type ResultadoBusqueda = Awaited<
  ReturnType<typeof TorneosService.buscarParejasLlaveExternas>
>[number];

export function LlaveAltaParejaPanel({
  torneoId,
  esNacional,
  motivoAuditoria,
  slotDestino,
  onInscripcionCreada,
}: {
  torneoId: string;
  esNacional: boolean;
  motivoAuditoria: string;
  slotDestino: "a" | "b";
  onInscripcionCreada: (datos: {
    id: string;
    label: string;
    name1: string;
    name2: string | null;
  }) => void;
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
    const payload = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      ...(categoria.trim() ? { categoria_padel: categoria.trim() } : {}),
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

  const confirmarAlta = async () => {
    if (!validarMotivo()) return;

    setGuardando(true);
    try {
      const inscripcion =
        modo === "externa"
          ? await TorneosService.altaParejaLlave(torneoId, {
              modo: "externa",
              inscripcion_origen_id: seleccionExterna,
              motivo: motivoAuditoria.trim(),
              ...(letraPrioridad.trim()
                ? { letra_prioridad: letraPrioridad.trim() }
                : {}),
            })
          : await TorneosService.altaParejaLlave(torneoId, {
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
              motivo: motivoAuditoria.trim(),
              ...(letraPrioridad.trim()
                ? { letra_prioridad: letraPrioridad.trim() }
                : {}),
            });

      const j2NombreIns =
        inscripcion.jugador2_nombre &&
        inscripcion.jugador2_nombre !== "-"
          ? inscripcion.jugador2_nombre
          : null;
      const label = j2NombreIns
        ? `${inscripcion.jugador1_nombre} / ${j2NombreIns}`
        : inscripcion.jugador1_nombre;

      onInscripcionCreada({
        id: inscripcion.id,
        label,
        name1: inscripcion.jugador1_nombre,
        name2: j2NombreIns,
      });

      sileo.success({
        title: "Pareja inscripta",
        description: `Quedó asignada al lado ${slotDestino.toUpperCase()}. Guardá el partido para registrar el cambio.`,
      });
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      sileo.error({
        title: "No se pudo dar de alta la pareja",
        description:
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Revisá los datos e intentá de nuevo.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-chartreuse/20 bg-brand-chartreuse/5 p-3 space-y-3">
      <p className="text-xs text-gray-300 leading-relaxed">
        Si la pareja no está en este torneo, buscala en otra categoría o
        cargala por DNI. Queda inscripta y disponible en el lado{" "}
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
                  onClick={() =>
                    setSeleccionExterna(row.inscripcion_origen_id)
                  }
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] border ${
                    seleccionExterna === row.inscripcion_origen_id
                      ? "border-brand-chartreuse/50 bg-brand-chartreuse/10 text-white"
                      : "border-white/8 bg-black/20 text-gray-300 hover:border-white/20"
                  }`}
                >
                  {row.etiqueta}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            disabled={guardando || !seleccionExterna}
            onClick={() => void confirmarAlta()}
            className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-chartreuse text-brand-black disabled:opacity-40"
          >
            Inscribir y usar en lado {slotDestino.toUpperCase()}
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
            </div>
          )}
          <button
            type="button"
            disabled={guardando || !j1.trim()}
            onClick={() => void confirmarAlta()}
            className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-chartreuse text-brand-black disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <UserPlus className="size-3.5" />
            Alta e inscripción en lado {slotDestino.toUpperCase()}
          </button>
        </>
      )}
    </div>
  );
}
