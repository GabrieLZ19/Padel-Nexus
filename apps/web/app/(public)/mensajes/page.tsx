"use client";

import { Suspense } from "react";
import ChatInbox from "@/components/chat/ChatInbox";

function MensajesContent() {
  return (
    <ChatInbox
      title="Mensajes"
      subtitle="Chats de reservas, marketplace, directos y soporte"
      defaultTab="todos"
      className="min-h-0"
    />
  );
}

export default function MensajesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100dvh-4.5rem)] flex items-center justify-center bg-brand-black">
          <div className="size-8 border-2 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MensajesContent />
    </Suspense>
  );
}
