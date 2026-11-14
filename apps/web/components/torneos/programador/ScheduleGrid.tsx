"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, GripVertical, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type {
  BoardPartido,
  ProgramacionBoard,
  ProgramacionIssue,
  IssueSeverity,
} from "@/utils/services/torneos";

interface Props {
  board: ProgramacionBoard;
  day: string;
  readOnly?: boolean;
  highlightedPartidoId?: string | null;
  onRemove: (partidoId: string) => void;
  partidoEnSlot: (slotKey: string) => BoardPartido | undefined;
  issueByPartido: (partidoId: string) => ProgramacionIssue | null;
}

function severityClass(sev: IssueSeverity | undefined): string {
  if (sev === "bad")
    return "prog-booking-bad border-red-500/70 bg-red-500/20 ring-1 ring-red-500/40";
  if (sev === "wait")
    return "prog-booking-wait border-amber-400/60 bg-amber-500/15 ring-1 ring-amber-400/30";
  return "prog-booking-ok border-emerald-500/40 bg-emerald-500/10";
}

function BookingCard({
  partido,
  issue,
  readOnly,
  highlighted,
  onRemove,
}: {
  partido: BoardPartido;
  issue: ProgramacionIssue | null;
  readOnly?: boolean;
  highlighted?: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `booking-${partido.id}`,
      data: { type: "booking", partido },
      disabled: readOnly,
    });
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlighted]);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    cardRef.current = node;
  };

  const hasIssue = issue && issue.severity !== "ok";

  return (
    <div
      ref={setRefs}
      id={`booking-card-${partido.id}`}
      style={style}
      className={`prog-booking relative flex h-full min-h-[52px] flex-col rounded-lg border p-1.5 text-left ${severityClass(
        issue?.severity,
      )} ${highlighted ? "outline outline-2 outline-offset-1 outline-brand-chartreuse" : ""}`}
      title={issue?.message || partido.label}
    >
      <div className="relative z-20 mb-0.5 flex shrink-0 items-center gap-0.5 border-b border-white/10 pb-0.5">
        {!readOnly ? (
          <button
            type="button"
            className="touch-none shrink-0 cursor-grab rounded p-0.5 text-gray-500 hover:bg-black/20 hover:text-white active:cursor-grabbing"
            aria-label="Arrastrar para mover de horario"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-3.5" aria-hidden />
          </button>
        ) : null}
        {hasIssue ? (
          <AlertTriangle
            className={`size-3 shrink-0 ${
              issue.severity === "bad" ? "text-red-400" : "text-amber-300"
            }`}
            aria-hidden
          />
        ) : null}
        <p className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase opacity-80">
          {partido.ronda_etiqueta || partido.ronda}
        </p>
        {!readOnly ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="relative z-30 shrink-0 cursor-pointer rounded p-0.5 text-gray-400 hover:bg-black/30 hover:text-white"
            aria-label="Quitar de la grilla"
            title="Quitar horario y devolver a Pendientes"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight">
          {partido.label_a}
        </p>
        <p className="text-[10px] opacity-70">vs</p>
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight">
          {partido.label_b}
        </p>
        {hasIssue ? (
          <p
            className={`mt-1 line-clamp-2 text-[9px] leading-tight ${
              issue.severity === "bad" ? "text-red-300" : "text-amber-200"
            }`}
          >
            {issue.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SlotCell({
  slotKey,
  partido,
  issue,
  readOnly,
  highlighted,
  onRemove,
}: {
  slotKey: string;
  partido?: BoardPartido;
  issue: ProgramacionIssue | null;
  readOnly?: boolean;
  highlighted?: boolean;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotKey}`,
    data: { type: "slot", slotKey },
    disabled: readOnly,
  });

  return (
    <td
      ref={setNodeRef}
      className={`min-w-[160px] border border-white/5 p-1 align-top sm:min-w-[180px] ${
        isOver ? "bg-brand-chartreuse/15" : ""
      }`}
    >
      {partido ? (
        <BookingCard
          partido={partido}
          issue={issue}
          readOnly={readOnly}
          highlighted={highlighted}
          onRemove={() => onRemove(partido.id)}
        />
      ) : (
        <div className="prog-slot flex h-full min-h-[52px] items-center justify-center rounded-lg text-[10px] font-semibold">
          Libre
        </div>
      )}
    </td>
  );
}

export function ScheduleGrid({
  board,
  day,
  readOnly,
  highlightedPartidoId,
  onRemove,
  partidoEnSlot,
  issueByPartido,
}: Props) {
  const daySlots = useMemo(
    () => board.slots.filter((s) => s.fecha === day),
    [board.slots, day],
  );

  const hours = useMemo(() => {
    const set = new Set(daySlots.map((s) => s.hora));
    const hourToMin = (h: string) => {
      const [hh, mm] = h.slice(0, 5).split(":").map(Number);
      const mins = (hh || 0) * 60 + (mm || 0);
      return mins < 360 ? mins + 1440 : mins;
    };
    return [...set].sort((a, b) => hourToMin(a) - hourToMin(b));
  }, [daySlots]);

  const courts = useMemo(() => {
    const labels = new Set(daySlots.map((s) => s.cancha_label));
    const ordered = board.canchas
      .map((c) => c.label)
      .filter((l) => labels.has(l));
    for (const l of labels) {
      if (!ordered.includes(l)) ordered.push(l);
    }
    return ordered;
  }, [board.canchas, daySlots]);

  const slotLookup = useMemo(() => {
    const m = new Map<string, (typeof daySlots)[0]>();
    for (const s of daySlots) {
      m.set(`${s.hora}|${s.cancha_label}`, s);
    }
    return m;
  }, [daySlots]);

  if (!day) {
    return (
      <div className="prog-surface flex h-full min-h-[240px] items-center justify-center rounded-2xl p-8 text-center text-sm text-brand-ayuda">
        Seleccioná una jornada.
      </div>
    );
  }

  if (hours.length === 0 || courts.length === 0) {
    return (
      <div className="prog-surface flex h-full min-h-[240px] items-center justify-center rounded-2xl p-8 text-center text-sm text-brand-ayuda">
        No hay canchas para este día. Sumalas con Agregar club / cancha:
        la grilla se arma de 08:00 a 00:00.
      </div>
    );
  }

  return (
    <div className="prog-grid prog-surface h-full min-h-[320px] overflow-auto rounded-2xl lg:min-h-0">
      <table className="h-full w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            <th className="prog-sticky sticky left-0 z-10 px-3 py-2 text-xs font-bold text-brand-ayuda">
              Hora
            </th>
            {courts.map((c) => {
              const meta = board.canchas.find((x) => x.label === c);
              return (
                <th
                  key={c}
                  className="min-w-[160px] px-2 py-2 text-xs font-bold text-brand-white sm:min-w-[180px]"
                >
                  <span className="block truncate">{meta?.cancha || c}</span>
                  {meta?.club ? (
                    <span className="block truncate text-[10px] font-medium text-gray-500">
                      {meta.club}
                    </span>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {hours.map((hora) => (
            <tr key={hora} className="h-full">
              <td className="prog-sticky sticky left-0 z-10 whitespace-nowrap px-3 py-1 text-xs font-semibold">
                {hora}
              </td>
              {courts.map((court) => {
                const slot = slotLookup.get(`${hora}|${court}`);
                if (!slot) {
                  return (
                    <td
                      key={`${hora}-${court}`}
                      className="border border-white/5 p-1 align-top"
                    >
                      <div className="prog-slot h-full min-h-[52px] rounded-lg" />
                    </td>
                  );
                }
                const partido = partidoEnSlot(slot.key);
                return (
                  <SlotCell
                    key={slot.key}
                    slotKey={slot.key}
                    partido={partido}
                    issue={partido ? issueByPartido(partido.id) : null}
                    readOnly={readOnly}
                    highlighted={
                      Boolean(partido) &&
                      partido!.id === highlightedPartidoId
                    }
                    onRemove={onRemove}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
