"use client";

import { Suspense } from "react";
import ChatInbox from "@/components/chat/ChatInbox";

function MensajesContent() {
  return (
    <ChatInbox
      title="Mensajes"
      subtitle="Chats de marketplace, directos y soporte"
      defaultTab="marketplace"
      className="min-h-[calc(100vh-80px)]"
    />
  );
}

export default function MensajesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-brand-black">
          <div className="size-8 border-2 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MensajesContent />
    </Suspense>
  );
}
