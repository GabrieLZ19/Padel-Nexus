export interface ChatProductoContexto {
  id: string;
  nombre: string;
  precio: number;
  thumbnail_url: string | null;
  imagenes: string[] | null;
}

export interface ChatConversacion {
  id: string;
  creado_por: string;
  tipo: "directo" | "soporte" | "marketplace";
  created_at: string;
  producto_id?: string | null;
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
  producto?: ChatProductoContexto | null;
}

export interface ChatMensaje {
  id: string;
  conversacion_id: string;
  remitente_id: string;
  contenido: string;
  leido: boolean;
  created_at: string;
}
