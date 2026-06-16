"use client";

import QRCode from "react-qr-code";

interface Props {
  usuarioId: string;
}

export default function CredencialDigital({ usuarioId }: Props) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Si no hay origin todavía (fase de render inicial), mostramos el placeholder
  if (!origin) {
    return (
      <div className="w-35 h-35 bg-white/5 animate-pulse rounded-2xl"></div>
    );
  }

  const verificationUrl = `${origin}/verificar/${usuarioId}`;

  return (
    <div className="bg-white p-2.5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center">
      <QRCode
        value={verificationUrl}
        size={140}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        viewBox={`0 0 256 256`}
      />
    </div>
  );
}
