export interface ChatProductoContexto {
  id: string;
  nombre: string;
  precio: number;
  thumbnail_url: string | null;
  imagenes: string[] | null;
}

export interface ChatPartidoParticipante {
  id: string;
  nombre: string | null;
  apellido: string | null;
  avatar_url: string | null;
}

export interface ChatPartidoContexto {
  id: string;
  nivel_requerido: string | null;
  estado: string;
  club_nombre: string | null;
  cancha_nombre: string | null;
  localidad: string | null;
  provincia: string | null;
  fecha_reserva: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  participantes: ChatPartidoParticipante[];
}

export interface ChatConversacion {
  id: string;
  creado_por: string;
  tipo: "directo" | "soporte" | "marketplace" | "partido";
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
  partido?: ChatPartidoContexto | null;
}

export interface ChatMensaje {
  id: string;
  conversacion_id: string;
  remitente_id: string;
  contenido: string;
  leido: boolean;
  created_at: string;
}
