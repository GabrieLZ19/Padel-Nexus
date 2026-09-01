export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: "info" | "success" | "warning" | "error";
  leido: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}
