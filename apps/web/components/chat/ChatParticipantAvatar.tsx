"use client";

import Image from "next/image";
import { User } from "lucide-react";
import {
  inicialesParticipante,
  type ChatParticipanteInfo,
} from "./chatParticipants";

type Props = {
  participante?: ChatParticipanteInfo | null;
  size?: "xs" | "sm" | "md";
  className?: string;
};

const SIZE_CLASSES = {
  xs: "size-7 text-[9px]",
  sm: "size-8 text-[10px]",
  md: "size-10 text-xs",
} as const;

const IMAGE_SIZES = {
  xs: 28,
  sm: 32,
  md: 40,
} as const;

export default function ChatParticipantAvatar({
  participante,
  size = "sm",
  className = "",
}: Props) {
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={`rounded-full bg-brand-white/10 border border-brand-white/10 overflow-hidden flex items-center justify-center shrink-0 ${sizeClass} ${className}`}
    >
      {participante?.avatar_url ? (
        <Image
          src={participante.avatar_url}
          alt=""
          width={IMAGE_SIZES[size]}
          height={IMAGE_SIZES[size]}
          className="size-full object-cover"
        />
      ) : participante ? (
        <span className="font-black text-brand-chartreuse">
          {inicialesParticipante(participante)}
        </span>
      ) : (
        <User className="size-4 text-gray-500" />
      )}
    </div>
  );
}
