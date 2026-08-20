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
    productoId?: string,
  ): Promise<{ id: string; nueva: boolean }> {
    const payload: { destinatario_id: string; producto_id?: string } = {
      destinatario_id: destinatarioId,
    };
    if (productoId) {
      payload.producto_id = productoId;
    }

    const { data } = await api.post("/mensajes/conversaciones", payload);
    return data.data;
  }

  static async iniciarChatProducto(
    productoId: string,
  ): Promise<{ id: string; nueva: boolean }> {
    const { data } = await api.post("/mensajes/conversaciones", {
      producto_id: productoId,
    });
    return data.data;
  }

  static async iniciarSoporte(): Promise<{ id: string; nueva: boolean }> {
    const { data } = await api.post("/mensajes/soporte");
    return data.data;
  }

  static async getNoLeidos(
    tipo?: "directo" | "soporte" | "marketplace",
  ): Promise<number> {
    const { data } = await api.get("/mensajes/no-leidos", {
      params: tipo ? { tipo } : undefined,
    });
    const total = Number(data?.total);
    return Number.isFinite(total) && total > 0 ? total : 0;
  }
}
