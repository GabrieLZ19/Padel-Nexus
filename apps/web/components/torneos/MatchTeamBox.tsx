"use client";

import React from "react";
import { User, CheckCircle2 } from "lucide-react";

export function splitPlayerName(full?: string | null): {
  apellido: string;
  nombre: string;
} {
  if (!full) return { apellido: "—", nombre: "" };
  const cleaned = full
    .trim()
    .replace(/^[\s,.\-]+/, "")
    .replace(/[\s,.\-]+$/, "");
  if (!cleaned || cleaned === "," || cleaned === "." || cleaned === "-") {
    return { apellido: "—", nombre: "" };
  }
  const idx = cleaned.indexOf(",");
  if (idx === -1) {
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return { apellido: parts[0], nombre: "" };
    return {
      apellido: parts[0],
      nombre: parts.slice(1).join(" "),
    };
  }
  return {
    apellido: cleaned.slice(0, idx).trim() || "—",
    nombre: cleaned.slice(idx + 1).trim(),
  };
}

export function PlayerAvatar({
  src,
  size = "md",
}: {
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm" ? "size-7" : size === "lg" ? "size-9" : "size-8";
  const icon =
    size === "sm" ? "size-3.5" : size === "lg" ? "size-[18px]" : "size-4";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${dim} rounded-full object-cover border border-white/15 shrink-0 bg-white/5`}
      />
    );
  }
  return (
    <span
      className={`${dim} rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0`}
    >
      <User className={icon} />
    </span>
  );
}

export function PlayerLine({
  fullName,
  avatarUrl,
  align = "left",
  size = "md",
}: {
  fullName?: string | null;
  avatarUrl?: string | null;
  align?: "left" | "right";
  size?: "sm" | "md";
}) {
  const { apellido, nombre } = splitPlayerName(fullName);
  const isRight = align === "right";

  return (
    <div
      className={`flex items-center gap-2 min-w-0 ${
        isRight ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <PlayerAvatar src={avatarUrl} size={size} />
      <div className="min-w-0 leading-tight">
        <p
          className={`font-black text-white truncate ${
            size === "sm" ? "text-[11px]" : "text-xs"
          }`}
        >
          {apellido}
        </p>
        {nombre ? (
          <p
            className={`text-gray-400 truncate font-medium ${
              size === "sm" ? "text-[10px]" : "text-[11px]"
            }`}
          >
            {nombre}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TeamBox({
  j1,
  j2,
  avatarJ1,
  avatarJ2,
  club,
  align = "left",
  isWinner = false,
  compact = false,
}: {
  j1?: string | null;
  j2?: string | null;
  avatarJ1?: string | null;
  avatarJ2?: string | null;
  club?: string | null;
  align?: "left" | "right";
  isWinner?: boolean;
  compact?: boolean;
}) {
  const isRight = align === "right";
  return (
    <div
      className={`rounded-lg border px-2.5 py-2.5 min-w-0 h-full ${
        isWinner
          ? "bg-brand-chartreuse/10 border-brand-chartreuse/40 shadow-[inset_0_0_0_1px_rgba(196,255,0,0.12)]"
          : "bg-[#0d0d0d] border-white/12"
      } ${isRight ? "text-right" : "text-left"}`}
    >
      <div
        className={`flex items-center gap-1.5 mb-1.5 ${
          isRight ? "justify-end" : "justify-start"
        }`}
      >
        {isWinner && (
          <CheckCircle2 className="size-3.5 text-brand-chartreuse shrink-0" />
        )}
        <p className="text-[9px] font-black uppercase tracking-wider text-rose-400/90 truncate">
          {club && club !== "Sin club asignado" ? club : "Sin club"}
        </p>
      </div>
      <div className={`space-y-1.5 ${compact ? "space-y-1" : ""}`}>
        <PlayerLine
          fullName={j1}
          avatarUrl={avatarJ1}
          align={align}
          size={compact ? "sm" : "md"}
        />
        {j2 && j2 !== "-" && (
          <PlayerLine
            fullName={j2}
            avatarUrl={avatarJ2}
            align={align}
            size={compact ? "sm" : "md"}
          />
        )}
      </div>
    </div>
  );
}

export function FinishedMatchScore({
  set1A,
  set1B,
  set2A,
  set2B,
  set3A,
  set3B,
  esWo = false,
  esSupertiebreak = false,
}: {
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
  esWo?: boolean;
  esSupertiebreak?: boolean;
}) {
  if (esWo) {
    return (
      <div className="flex flex-col items-center justify-center min-w-[5.5rem] px-2 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <span className="text-lg font-black text-amber-400 tracking-tight">
          W.O.
        </span>
        <span className="text-[8px] font-bold uppercase text-amber-400/70 tracking-wider mt-0.5">
          Walkover
        </span>
      </div>
    );
  }

  const sets: Array<{
    label: string;
    a: number | null;
    b: number | null;
  }> = [
    { label: "Set 1", a: set1A, b: set1B },
    { label: "Set 2", a: set2A, b: set2B },
  ];

  if (set3A !== null && set3B !== null) {
    sets.push({
      label: esSupertiebreak ? "STB" : "Set 3",
      a: set3A,
      b: set3B,
    });
  }

  const scoreBox = (value: number | null, won: boolean) => (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-black text-sm sm:text-base tabular-nums border ${
        won
          ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
          : "bg-[#161616] text-gray-300 border-white/12"
      }`}
    >
      {value ?? "–"}
    </span>
  );

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-[#0a0a0a]/80 border border-white/8 min-w-[7.5rem]">
      <div className="flex gap-1.5">
        {sets.map((s) => (
          <span
            key={s.label}
            className="w-9 sm:w-10 text-center text-[8px] font-black uppercase tracking-wider text-gray-500"
          >
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        {sets.map((s) => (
          <React.Fragment key={`a-${s.label}`}>
            {scoreBox(
              s.a,
              s.a !== null && s.b !== null && Number(s.a) > Number(s.b),
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="h-px w-full max-w-[7rem] bg-white/10" />
      <div className="flex gap-1.5">
        {sets.map((s) => (
          <React.Fragment key={`b-${s.label}`}>
            {scoreBox(
              s.b,
              s.a !== null && s.b !== null && Number(s.b) > Number(s.a),
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
