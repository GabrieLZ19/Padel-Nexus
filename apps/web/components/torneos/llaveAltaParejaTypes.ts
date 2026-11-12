export type AltaLlavePendientePayload =
  | {
      modo: "externa";
      inscripcion_origen_id: string;
      letra_prioridad?: string;
    }
  | {
      modo: "manual";
      jugador1_identificador: string;
      jugador2_identificador?: string;
      jugador1_datos?: {
        nombre?: string;
        apellido?: string;
        categoria_padel?: string;
        fecha_nacimiento?: string;
        telefono?: string;
      };
      jugador2_datos?: {
        nombre?: string;
        apellido?: string;
        categoria_padel?: string;
        fecha_nacimiento?: string;
        telefono?: string;
      };
      letra_prioridad?: string;
    };

export type AltaLlavePreparada = {
  tempId: string;
  label: string;
  name1: string;
  name2: string | null;
  payload: AltaLlavePendientePayload;
};

export function esIdInscripcionPendiente(id: string | null | undefined): boolean {
  return Boolean(id && id.startsWith("pending-alta-"));
}
