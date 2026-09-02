interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  message?: string;
}

export class PushNotificationService {
  static async enviarExpoPush(params: {
    expoPushToken: string;
    titulo: string;
    mensaje: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const token = params.expoPushToken.trim();
    if (!token.startsWith("ExponentPushToken") && !token.startsWith("ExpoPushToken")) {
      return;
    }

    const message: ExpoPushMessage = {
      to: token,
      title: params.titulo,
      body: params.mensaje,
      data: params.data,
      sound: "default",
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.warn("⚠️ Expo push HTTP error:", response.status);
        return;
      }

      const payload = (await response.json()) as { data?: ExpoPushTicket[] };
      const ticket = payload.data?.[0];
      if (ticket?.status === "error") {
        console.warn("⚠️ Expo push ticket error:", ticket.message);
      }
    } catch (error) {
      console.warn("⚠️ No se pudo enviar push nativa:", error);
    }
  }
}
