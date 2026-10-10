"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { TorneosService } from "@/utils/services/torneos";

type ParejaZona = { id: string; nombre: string };
type ZonaPanel = { id: string; nombre: string; parejas: ParejaZona[] };

type Movimiento = {
  inscripcionId: string;
  nombre: string;
  origenId: string;
  destinoId: string;
  destinoNombre: string;
};

function nombrePareja(ins: Record<string, unknown> | null): string {
  if (!ins) return "Pareja";
  const denominacion = ins.denominacion_nacional;
  if (typeof denominacion === "string" && denominacion.trim()) return denominacion;
  const j1 = typeof ins.jugador1_nombre === "string" ? ins.jugador1_nombre : "";
  const j2 = typeof ins.jugador2_nombre === "string" ? ins.jugador2_nombre : "";
  return [j1, j2].filter(Boolean).join(" / ") || "Pareja";
}

function leerZonas(raw: unknown): ZonaPanel[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((zona) => {
    if (!zona || typeof zona !== "object") return [];
    const grupo = zona as Record<string, unknown>;
    if (typeof grupo.id !== "string") return [];
    const parejasRaw = Array.isArray(grupo.grupo_parejas)
      ? grupo.grupo_parejas
      : [];
    const parejas = parejasRaw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const pareja = item as Record<string, unknown>;
      if (typeof pareja.inscripcion_id !== "string") return [];
      if (pareja.descalificada === true) return [];
      const ins =
        pareja.inscripciones && typeof pareja.inscripciones === "object"
          ? (pareja.inscripciones as Record<string, unknown>)
          : null;
      return [{ id: pareja.inscripcion_id, nombre: nombrePareja(ins) }];
    });
    return [
      {
        id: grupo.id,
        nombre:
          typeof grupo.nombre_grupo === "string" ? grupo.nombre_grupo : "Zona",
        parejas,
      },
    ];
  });
}

function ParejaCard({
  pareja,
  zonaId,
  readOnly,
}: {
  pareja: ParejaZona;
  zonaId: string;
  readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `pareja-${pareja.id}`,
      data: { inscripcionId: pareja.id, zonaId, nombre: pareja.nombre },
      disabled: readOnly,
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : 1,
      }}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
    >
      <button
        type="button"
        className="cursor-grab text-white/40 disabled:cursor-default"
        disabled={readOnly}
        {...listeners}
        {...attributes}
      >
        <GripVertical size={14} />
      </button>
      <span className="truncate text-[11px] font-medium text-white">
        {pareja.nombre}
      </span>
    </div>
  );
}

function ZonaDrop({
  zona,
  readOnly,
}: {
  zona: ZonaPanel;
  readOnly?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `zona-${zona.id}` });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-1.5 rounded-xl border p-2 ${
        isOver
          ? "border-brand-chartreuse bg-brand-chartreuse/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-brand-chartreuse">
        {zona.nombre}
      </p>
      {zona.parejas.length === 0 ? (
        <p className="text-[11px] text-white/40">Sin parejas</p>
      ) : (
        zona.parejas.map((pareja) => (
          <ParejaCard
            key={pareja.id}
            pareja={pareja}
            zonaId={zona.id}
            readOnly={readOnly}
          />
        ))
      )}
    </div>
  );
}

export default function ZonaParejasPanel({
  torneoId,
  readOnly,
  onMoved,
}: {
  torneoId: string;
  readOnly?: boolean;
  onMoved: () => void;
}) {
  const [zonas, setZonas] = useState<ZonaPanel[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null);
  const [guardando, setGuardando] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const cargar = useCallback(async () => {
    try {
      const data = await TorneosService.getZonas(torneoId);
      setZonas(leerZonas(data));
    } catch {
      setZonas([]);
    }
  }, [torneoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const confirmar = async (motivo?: string) => {
    if (!movimiento || !motivo?.trim()) return;
    setGuardando(true);
    try {
      await TorneosService.moverPareja({
        inscripcion_id: movimiento.inscripcionId,
        grupo_origen_id: movimiento.origenId,
        grupo_destino_id: movimiento.destinoId,
        motivo: motivo.trim(),
      });
      sileo.success({ title: "Pareja movida. Cuadros y horarios actualizados." });
      setMovimiento(null);
      await cargar();
      onMoved();
    } catch {
      sileo.error({ title: "No se pudo mover la pareja." });
    } finally {
      setGuardando(false);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const overId = String(event.over?.id || "");
    if (!overId.startsWith("zona-")) return;
    const data = event.active.data.current as
      | { inscripcionId?: string; zonaId?: string; nombre?: string }
      | undefined;
    if (!data?.inscripcionId || !data.zonaId) return;
    const destinoId = overId.slice("zona-".length);
    if (destinoId === data.zonaId) return;
    const destino = zonas.find((zona) => zona.id === destinoId);
    setMovimiento({
      inscripcionId: data.inscripcionId,
      nombre: data.nombre || "Pareja",
      origenId: data.zonaId,
      destinoId,
      destinoNombre: destino?.nombre || "otra zona",
    });
  };

  if (zonas.length === 0) return null;

  return (
    <section className="shrink-0 rounded-2xl border border-white/10 bg-[#141414]">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-2 text-left"
      >
        <ChevronDown
          className={`size-3.5 shrink-0 text-gray-400 transition-transform ${
            abierto ? "" : "-rotate-90"
          }`}
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 truncate text-xs font-bold text-white">
          Parejas por zona
        </h3>
        <span className="text-xs font-medium text-gray-400">{zonas.length}</span>
      </button>
      {abierto ? (
        <>
          <p className="px-2.5 pb-2 text-xs leading-4 text-gray-400">
            Arrastrá una pareja a otra zona. El cambio se guarda en los cuadros
            y conserva el horario de los cruces que siguen iguales.
          </p>
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="max-h-36 space-y-2 overflow-auto px-2.5 pb-2">
              {zonas.map((zona) => (
                <ZonaDrop key={zona.id} zona={zona} readOnly={readOnly} />
              ))}
            </div>
          </DndContext>
        </>
      ) : null}
      <FeedbackModal
        isOpen={movimiento !== null}
        onClose={() => {
          if (!guardando) setMovimiento(null);
        }}
        type="warning"
        title="Mover pareja de zona"
        description={
          movimiento
            ? `${movimiento.nombre} pasa a ${movimiento.destinoNombre}. Los partidos de esas zonas se rearman y se mantiene el horario de los cruces que no cambian.`
            : ""
        }
        showInput
        inputPlaceholder="Motivo del cambio"
        confirmText="Mover"
        isLoading={guardando}
        onConfirm={(motivo) => void confirmar(motivo)}
      />
    </section>
  );
}
