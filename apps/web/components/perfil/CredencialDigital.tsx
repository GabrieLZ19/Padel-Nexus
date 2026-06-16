"use client";

import QRCode from "react-qr-code";

interface Props {
  usuarioId: string;
}

export default function CredencialQR({ usuarioId }: Props) {
  const verificationUrl = `${window.location.origin}/verificar/${usuarioId}`;

  return (
    <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
      <QRCode
        value={verificationUrl}
        size={160}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        viewBox={`0 0 256 256`}
      />
    </div>
  );
}
