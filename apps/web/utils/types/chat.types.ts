export interface ChatConversacion {
  id: string;
  creado_por: string;
  tipo: "directo" | "soporte";
  created_at: string;
  otro_participante: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    avatar_url: string | null;
    rol: string;
  };
  ultimo_mensaje: {
    contenido: string;
    created_at: string;
    remitente_id: string;
  } | null;
  no_leidos: number;
}

export interface ChatMensaje {
  id: string;
  conversacion_id: string;
  remitente_id: string;
  contenido: string;
  leido: boolean;
  created_at: string;
}
