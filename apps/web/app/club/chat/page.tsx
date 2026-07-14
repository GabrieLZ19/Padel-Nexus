"use client";

import DashboardChatPage from "../../dashboard/chat/page";

export default function ClubChatPage() {
  // Reutiliza al 100% el componente premium de chat ya implementado,
  // dado que el backend filtra las conversaciones correspondientes
  // al usuario logueado de forma automática y transparente.
  return <DashboardChatPage />;
}
