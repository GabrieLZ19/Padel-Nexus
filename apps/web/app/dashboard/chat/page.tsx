"use client";

import ChatInbox from "@/components/chat/ChatInbox";

export default function DashboardChatPage() {
  return (
    <div className="flex min-h-0 flex-col lg:absolute lg:inset-0 lg:overflow-hidden">
      <ChatInbox
        title="Chat Interno"
        subtitle="Mensajería en tiempo real con usuarios y soporte"
        showSoporteButton
        ocuparAlto
      />
    </div>
  );
}
