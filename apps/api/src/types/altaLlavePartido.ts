export type AltaLlaveEnPartidoInput =
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

export type OpcionesAltaEnActualizarEquipos = {
  altaLadoA?: AltaLlaveEnPartidoInput;
  altaLadoB?: AltaLlaveEnPartidoInput;
};
