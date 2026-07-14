import { api } from "../api";
import { ChatConversacion, ChatMensaje } from "../types";

export class ChatService {
  static async getConversaciones(): Promise<ChatConversacion[]> {
    const { data } = await api.get("/mensajes/conversaciones");
    return data.data || [];
  }

  static async getMensajes(
    conversacionId: string,
    cursor?: string,
  ): Promise<{ mensajes: ChatMensaje[]; hay_mas: boolean }> {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;

    const { data } = await api.get(
      `/mensajes/conversaciones/${conversacionId}`,
      { params },
    );
    return { mensajes: data.mensajes || [], hay_mas: data.hay_mas || false };
  }

  static async iniciarChat(
    destinatarioId: string,
  ): Promise<{ id: string; nueva: boolean }> {
    const { data } = await api.post("/mensajes/conversaciones", {
      destinatario_id: destinatarioId,
    });
    return data.data;
  }

  static async iniciarSoporte(): Promise<{ id: string; nueva: boolean }> {
    const { data } = await api.post("/mensajes/soporte");
    return data.data;
  }

  static async getNoLeidos(): Promise<number> {
    const { data } = await api.get("/mensajes/no-leidos");
    return data.total || 0;
  }
}
