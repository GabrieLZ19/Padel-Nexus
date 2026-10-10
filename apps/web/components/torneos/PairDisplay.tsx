"use client";

import Link from "next/link";
import { PlayerAvatar, splitPlayerName } from "@/components/torneos/MatchTeamBox";
import { etiquetaInstitucion } from "@/utils/denominacionNacional";
import {
  POR_DEFINIR,
  apellidoVisible,
  denominacionVisible,
  esAlcanceNacional,
} from "@/utils/etiquetaPareja";

export { esAlcanceNacional };

export function jugadorHref(userId?: string | null): string | null {
  if (!userId) return null;
  return `/jugadores/${userId}`;
}

function PlayerNameLink({
  fullName,
  userId,
  etiqueta,
  className,
  won,
  openInNewTab = true,
}: {
  fullName?: string | null;
  userId?: string | null;
  /** Si viene, se muestra este texto (apellido) en lugar de «Apellido, Nombre». */
  etiqueta?: string | null;
  className?: string;
  won?: boolean;
  openInNewTab?: boolean;
}) {
  const { apellido, nombre } = splitPlayerName(fullName);
  const label = etiqueta || (nombre ? `${apellido}, ${nombre}` : apellido);
  const href = jugadorHref(userId);
  const base = `${className || ""} ${
    won ? "text-brand-chartreuse" : "text-brand-white"
  } hover:underline underline-offset-2`;

  if (!href) {
    return <span className={base}>{label === "—" ? "—" : label}</span>;
  }

  return (
    <Link
      href={href}
      className={base}
      onClick={(e) => e.stopPropagation()}
      {...(openInNewTab
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
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
  provincia?: string | null;
  letra_prioridad?: string | null;
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
  provincia,
  letra_prioridad,
  alcanceNacional = false,
  won = false,
  align = "left",
  compact = false,
  showAvatars = true,
  emptyLabel = POR_DEFINIR,
  variant = "stacked",
}: PairDisplayProps) {
  const denomRaw = etiquetaInstitucion({
    denominacion_nacional: denominacion,
    provincia,
    letra_prioridad,
  });
  // Sin provincia/letra: no hay error; se muestran nombres (fallback seguro).
  const denomLabel = denomRaw === "Sin denominación" ? "" : denomRaw;
  const empty = !j1 && !j2 && !denomLabel;
  const hasJ2 = Boolean(j2 && j2 !== "-");
  const denomTitulo = denominacionVisible({
    provincia,
    letra: letra_prioridad,
    denominacion: denomLabel || denominacion,
  });
  const apellido1 = apellidoVisible(j1);
  const apellido2 = apellidoVisible(j2);
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

  if (alcanceNacional && (denomTitulo || apellido1 || apellido2)) {
    return (
      <span
        className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 ${
          isRight ? "justify-end" : ""
        }`}
      >
        {showAvatars ? (
          <PlayerAvatar src={avatarJ1} size={compact ? "sm" : "md"} />
        ) : null}
        {denomTitulo ? (
          <span
            className={`font-black tracking-wide text-xs shrink-0 ${
              won ? "text-brand-chartreuse" : "text-brand-white"
            }`}
          >
            {denomTitulo}
          </span>
        ) : null}
        {denomTitulo && (apellido1 || apellido2) ? (
          <span className="text-gray-500 font-medium">·</span>
        ) : null}
        {apellido1 ? (
          <PlayerNameLink
            fullName={j1}
            userId={usuarioId}
            etiqueta={apellido1}
            won={won}
            className="font-bold text-xs"
          />
        ) : null}
        {apellido1 && apellido2 ? (
          <span className="text-gray-500 font-medium">/</span>
        ) : null}
        {apellido2 ? (
          <PlayerNameLink
            fullName={j2}
            userId={usuario2Id}
            etiqueta={apellido2}
            won={won}
            className="font-bold text-xs text-gray-400"
          />
        ) : null}
      </span>
    );
  }

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
                className="font-bold text-sm text-gray-500"
              />
            </>
          ) : null}
        </span>
      );
  }

  return namesBlock;
}
