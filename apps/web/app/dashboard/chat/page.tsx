"use client";

import ChatInbox from "@/components/chat/ChatInbox";

export default function DashboardChatPage() {
  return (
    <ChatInbox
      title="Chat Interno"
      subtitle="Mensajería en tiempo real con usuarios y soporte"
      showSoporteButton
    />
  );
}
