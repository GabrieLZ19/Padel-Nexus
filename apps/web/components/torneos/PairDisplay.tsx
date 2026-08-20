"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PlayerAvatar, splitPlayerName } from "@/components/torneos/MatchTeamBox";

export function esAlcanceNacional(alcance?: string | null): boolean {
  return /nacional/i.test(String(alcance || "").trim());
}

export function jugadorHref(userId?: string | null): string | null {
  if (!userId) return null;
  return `/jugadores/${userId}`;
}

function PlayerNameLink({
  fullName,
  userId,
  className,
  won,
}: {
  fullName?: string | null;
  userId?: string | null;
  className?: string;
  won?: boolean;
}) {
  const { apellido, nombre } = splitPlayerName(fullName);
  const label = nombre ? `${apellido}, ${nombre}` : apellido;
  const href = jugadorHref(userId);
  const base = `${className || ""} ${
    won ? "text-brand-chartreuse" : "text-white"
  } hover:underline underline-offset-2`;

  if (!href) {
    return <span className={base}>{label === "—" ? "—" : label}</span>;
  }

  return (
    <Link
      href={href}
      className={base}
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </Link>
  );
}

export type PairDisplayProps = {
  j1?: string | null;
  j2?: string | null;
  usuarioId?: string | null;
  usuario2Id?: string | null;
  avatarJ1?: string | null;
  avatarJ2?: string | null;
  denominacion?: string | null;
  alcanceNacional?: boolean;
  won?: boolean;
  align?: "left" | "right";
  compact?: boolean;
  showAvatars?: boolean;
  emptyLabel?: string;
  /** Lista / tabla: una sola línea expandible */
  variant?: "bracket" | "inline" | "stacked";
};

/**
 * Nacional: etiqueta PROVINCIA LETRA → expandir nombres → link a ficha.
 * Otros alcances: nombres clickeables directo.
 */
export function PairDisplay({
  j1,
  j2,
  usuarioId,
  usuario2Id,
  avatarJ1,
  avatarJ2,
  denominacion,
  alcanceNacional = false,
  won = false,
  align = "left",
  compact = false,
  showAvatars = true,
  emptyLabel = "—",
  variant = "stacked",
}: PairDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const empty = !j1 && !j2 && !denominacion;
  const hasJ2 = Boolean(j2 && j2 !== "-");
  const useDenominacion = Boolean(alcanceNacional && denominacion);
  const isRight = align === "right";

  if (empty) {
    return (
      <p className="text-xs text-gray-600 italic font-medium">{emptyLabel}</p>
    );
  }

  const namesBlock = (
    <div
      className={`space-y-1 min-w-0 ${isRight ? "text-right" : "text-left"} ${
        compact ? "space-y-0.5" : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 min-w-0 ${
          isRight ? "flex-row-reverse" : ""
        }`}
      >
        {showAvatars ? <PlayerAvatar src={avatarJ1} size={compact ? "sm" : "md"} /> : null}
        <PlayerNameLink
          fullName={j1}
          userId={usuarioId}
          won={won}
          className={`font-bold truncate ${compact ? "text-[11px]" : "text-xs sm:text-[13px]"}`}
        />
      </div>
      {hasJ2 ? (
        <div
          className={`flex items-center gap-2 min-w-0 ${
            isRight ? "flex-row-reverse" : ""
          }`}
        >
          {showAvatars ? (
            <PlayerAvatar src={avatarJ2} size={compact ? "sm" : "md"} />
          ) : null}
          <PlayerNameLink
            fullName={j2}
            userId={usuario2Id}
            won={won}
            className={`font-bold truncate ${compact ? "text-[11px]" : "text-xs sm:text-[13px]"}`}
          />
        </div>
      ) : null}
    </div>
  );

  if (!useDenominacion) {
    if (variant === "inline") {
      return (
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0">
          <PlayerNameLink
            fullName={j1}
            userId={usuarioId}
            won={won}
            className="font-bold text-sm"
          />
          {hasJ2 ? (
            <>
              <span className="text-gray-500 font-medium">/</span>
              <PlayerNameLink
                fullName={j2}
                userId={usuario2Id}
                won={won}
                className="font-bold text-sm text-gray-300"
              />
            </>
          ) : null}
        </span>
      );
    }
    return namesBlock;
  }

  return (
    <div className={`min-w-0 ${isRight ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className={`inline-flex items-center gap-1.5 max-w-full rounded-lg px-2 py-1 transition-colors cursor-pointer ${
          won
            ? "bg-brand-chartreuse/15 text-brand-chartreuse"
            : "bg-white/5 text-white hover:bg-white/10"
        } ${isRight ? "flex-row-reverse" : ""}`}
        aria-expanded={expanded}
      >
        <span
          className={`font-black uppercase tracking-wide truncate ${
            compact ? "text-[11px]" : "text-xs sm:text-sm"
          }`}
        >
          {denominacion}
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 opacity-70 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded ? <div className="mt-2">{namesBlock}</div> : null}
    </div>
  );
}
