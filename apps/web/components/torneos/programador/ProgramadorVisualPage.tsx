"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { SedesFiscalesTab } from "@/components/torneos/SedesFiscalesTab";
import type { BoardPartido } from "@/utils/services/torneos";
import { ConflictosPanel } from "./ConflictosPanel";
import { ProgramadorConfigBar } from "./ProgramadorConfigBar";
import { ProgramadorTopBar } from "./ProgramadorTopBar";
import { PendingMatchesSidebar } from "./PendingMatchesSidebar";
import ZonaParejasPanel from "./ZonaParejasPanel";
import { ScheduleGrid } from "./ScheduleGrid";
import { useProgramadorBoard } from "./useProgramadorBoard";

interface Props {
  torneoId: string;
  backHref: string;
}

export function ProgramadorVisualPage({ torneoId, backHref }: Props) {
  const router = useRouter();
  const {
    board,
    loading,
    busy,
    syncing,
    config,
    activeDay,
    setActiveDay,
    isReadOnly,
    bloqueadoPorAlcance,
    reloadWithConfig,
    asignar,
    desasignar,
    limpiar,
    autoAsignar,
    guardarBorrador,
    publicar,
    load,
    nuevaEdicion,
    issueByPartido,
    partidoEnSlot,
  } = useProgramadorBoard(torneoId);

  const [activeDrag, setActiveDrag] = useState<BoardPartido | null>(null);
  const [confirmPublicar, setConfirmPublicar] = useState(false);
  const [confirmEdicion, setConfirmEdicion] = useState(false);
  const [confirmLimpiar, setConfirmLimpiar] = useState(false);
  const [sedesAbiertas, setSedesAbiertas] = useState(false);
  const [highlightedPartidoId, setHighlightedPartidoId] = useState<
    string | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const focusConflictos = useCallback(() => {
    document
      .getElementById("programador-conflictos")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const handleSelectConflict = useCallback(
    (partidoId: string) => {
      if (!board) return;
      const partido = board.partidos.find((p) => p.id === partidoId);
      setHighlightedPartidoId(partidoId);
      if (partido?.fecha_partido) {
        const m = String(partido.fecha_partido).match(/^(\d{4}-\d{2}-\d{2})/);
        const day = m?.[1];
        if (day && board.dias.includes(day)) {
          setActiveDay(day);
        }
      }
      focusConflictos();
      window.setTimeout(() => {
        document
          .getElementById(`booking-card-${partidoId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    },
    [board, focusConflictos, setActiveDay],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const p = event.active.data.current?.partido as BoardPartido | undefined;
    setActiveDrag(p || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    if (isReadOnly || !board) return;

    const { active, over } = event;
    if (!over) return;

    const partido = active.data.current?.partido as BoardPartido | undefined;
    if (!partido) return;

    const overId = String(over.id);
    if (overId === "pending-tray") {
      if (partido.assigned) {
        void desasignar(partido.id);
      }
      return;
    }
    if (overId.startsWith("slot-")) {
      const slotKey = overId.replace(/^slot-/, "");
      const slot = board.slots.find((s) => s.key === slotKey);
      if (!slot) return;
      const occupant = partidoEnSlot(slotKey);
      // Asignar hace el swap optimista; desasignar del ocupante va en silencio a la API.
      if (occupant && occupant.id !== partido.id) {
        void desasignar(occupant.id, undefined, { silent: true });
      }
      void asignar(partido.id, slot.fecha_iso, slot.cancha_label);
    }
  };

  if (loading || !board) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        Cargando programador…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-4 md:px-6 md:py-6">
      <ProgramadorTopBar
        board={board}
        busy={busy}
        syncing={syncing}
        isReadOnly={isReadOnly}
        soloLectura={bloqueadoPorAlcance}
        onAgregarSede={() => setSedesAbiertas(true)}
        onGuardarBorrador={() => void guardarBorrador()}
        onAuto={() => void autoAsignar()}
        onLimpiar={() => setConfirmLimpiar(true)}
        onPublicar={() => setConfirmPublicar(true)}
        onNuevaEdicion={() => setConfirmEdicion(true)}
        onBack={() => router.push(backHref)}
        onFocusConflictos={focusConflictos}
      />

      <ProgramadorConfigBar
        config={config}
        dias={board.dias}
        activeDay={activeDay}
        disabled={isReadOnly || busy}
        syncing={syncing}
        onDayChange={setActiveDay}
        sugerencia={board.sugerencia?.mensaje}
        onChange={(next) => reloadWithConfig(next)}
      />

      <ConflictosPanel
        issues={board.issues}
        partidos={board.partidos}
        highlightedId={highlightedPartidoId}
        onSelect={handleSelectConflict}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className="order-2 max-h-[40vh] overflow-auto lg:order-1 lg:max-h-[calc(100vh-220px)]">
            <ZonaParejasPanel
              torneoId={torneoId}
              readOnly={isReadOnly}
              onMoved={() => void load()}
            />
            <PendingMatchesSidebar
              partidos={board.partidos}
              issues={board.issues}
              readOnly={isReadOnly}
            />
          </div>
          <div className="order-1 min-w-0 lg:order-2 lg:max-h-[calc(100vh-220px)] overflow-auto">
            <ScheduleGrid
              board={board}
              day={activeDay}
              readOnly={isReadOnly}
              highlightedPartidoId={highlightedPartidoId}
              onRemove={(id) => void desasignar(id)}
              partidoEnSlot={partidoEnSlot}
              issueByPartido={issueByPartido}
            />
          </div>
        </div>

        <DragOverlay>
          {activeDrag ? (
            <div className="rounded-xl border border-brand-chartreuse/50 bg-[#1a1a1a] px-3 py-2 shadow-xl">
              <p className="text-[10px] font-bold text-brand-chartreuse">
                {activeDrag.ronda_etiqueta || activeDrag.ronda}
              </p>
              <p className="text-xs font-semibold text-white">
                {activeDrag.label}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <FeedbackModal
        isOpen={confirmPublicar}
        onClose={() => setConfirmPublicar(false)}
        type="warning"
        title="Publicar programación"
        description={
          board.summary.advertencias > 0
            ? `Los horarios ya están guardados. Publicar los hace visibles al público y bloquea la grilla hasta una nueva edición. Hay ${board.summary.advertencias} alerta(s) que podés revisar antes.`
            : "Los horarios ya están guardados al soltar cada partido. Publicar los hace visibles al público y bloquea la grilla hasta una nueva edición."
        }
        confirmText="Publicar"
        onConfirm={() => {
          setConfirmPublicar(false);
          void publicar();
        }}
      />

      <FeedbackModal
        isOpen={confirmLimpiar}
        onClose={() => setConfirmLimpiar(false)}
        type="danger"
        title="¿Limpiar toda la programación?"
        description={`Se van a quitar los horarios de ${board.summary.asignados} partido(s). Los partidos vuelven a Pendientes y podés rearmar la grilla desde cero.`}
        confirmText="Limpiar todo"
        cancelText="Cancelar"
        onConfirm={() => {
          setConfirmLimpiar(false);
          void limpiar();
        }}
      />

      <FeedbackModal
        isOpen={confirmEdicion}
        onClose={() => setConfirmEdicion(false)}
        type="warning"
        title="Crear nueva edición"
        description="Se reabre la programación para editar. Indicá un motivo (queda en auditoría)."
        confirmText="Abrir edición"
        showInput
        inputLabel="Motivo"
        inputPlaceholder="Motivo del cambio"
        onConfirm={(inputValue) => {
          setConfirmEdicion(false);
          void nuevaEdicion(inputValue || undefined);
        }}
      />

      {sedesAbiertas ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-3 sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">Agregar club o cancha</p>
                <p className="text-xs text-gray-500">
                  La grilla se actualiza al cerrar, sin salir del programador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSedesAbiertas(false);
                  void load();
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            <div className="overflow-y-auto p-3 sm:p-4">
              <SedesFiscalesTab
                torneoId={torneoId}
                onRefresh={() => void load()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
