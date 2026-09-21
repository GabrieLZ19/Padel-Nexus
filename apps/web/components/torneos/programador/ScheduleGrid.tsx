"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, X } from "lucide-react";
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
  if (sev === "bad") return "border-red-500/70 bg-red-500/20 ring-1 ring-red-500/40";
  if (sev === "wait")
    return "border-amber-400/60 bg-amber-500/15 ring-1 ring-amber-400/30";
  return "border-emerald-500/40 bg-emerald-500/10";
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
      className={`relative h-full min-h-[52px] rounded-lg border p-1.5 text-left ${severityClass(
        issue?.severity,
      )} ${highlighted ? "outline outline-2 outline-offset-1 outline-brand-chartreuse" : ""} ${
        !readOnly ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      title={issue?.message || partido.label}
      {...listeners}
      {...attributes}
    >
      {hasIssue ? (
        <AlertTriangle
          className={`absolute left-0.5 top-0.5 size-3 ${
            issue.severity === "bad" ? "text-red-400" : "text-amber-300"
          }`}
          aria-hidden
        />
      ) : null}
      {!readOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-0.5 top-0.5 rounded p-0.5 text-gray-400 hover:bg-black/30 hover:text-white cursor-pointer"
          aria-label="Quitar de la grilla"
        >
          <X className="size-3" />
        </button>
      )}
      <p
        className={`pr-4 text-[10px] font-bold uppercase text-white/70 ${
          hasIssue ? "pl-4" : ""
        }`}
      >
        {partido.ronda}
      </p>
      <p className="text-[11px] font-semibold leading-tight text-white line-clamp-2">
        {partido.label_a}
      </p>
      <p className="text-[10px] text-white/50">vs</p>
      <p className="text-[11px] font-semibold leading-tight text-white line-clamp-2">
        {partido.label_b}
      </p>
      {hasIssue ? (
        <p
          className={`mt-1 text-[9px] leading-tight line-clamp-2 ${
            issue.severity === "bad" ? "text-red-300" : "text-amber-200"
          }`}
        >
          {issue.message}
        </p>
      ) : null}
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
      className={`min-w-[140px] border border-white/5 p-1 align-top ${
        isOver ? "bg-brand-chartreuse/15" : "bg-black/20"
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
        <div className="flex h-[52px] items-center justify-center rounded-lg border border-dashed border-white/10 text-[10px] text-gray-600">
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
    return [...set].sort();
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
      <div className="rounded-2xl border border-white/10 bg-[#161616] p-8 text-center text-sm text-gray-400">
        Seleccioná una jornada.
      </div>
    );
  }

  if (hours.length === 0 || courts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#161616] p-8 text-center text-sm text-gray-400">
        No hay canchas para este día. Agregá sedes y canchas en Paso 5 y volvé:
        la grilla se arma de 08:00 a 21:00.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-2xl border border-white/10 bg-[#161616]">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[#1a1a1a] px-3 py-2 text-xs font-bold text-gray-400">
              Hora
            </th>
            {courts.map((c) => {
              const meta = board.canchas.find((x) => x.label === c);
              return (
                <th
                  key={c}
                  className="min-w-[140px] px-2 py-2 text-xs font-bold text-white"
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
            <tr key={hora}>
              <td className="sticky left-0 z-10 whitespace-nowrap bg-[#1a1a1a] px-3 py-1 text-xs font-semibold text-gray-300">
                {hora}
              </td>
              {courts.map((court) => {
                const slot = slotLookup.get(`${hora}|${court}`);
                if (!slot) {
                  return (
                    <td
                      key={`${hora}-${court}`}
                      className="border border-white/5 bg-black/40 p-1"
                    >
                      <div className="h-[52px] rounded-lg bg-black/30" />
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
