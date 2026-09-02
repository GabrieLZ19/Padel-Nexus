export interface Club {
  id: string;
  nombre: string;
  provincia: string;
  localidad: string;
  direccion?: string;
  canchas: number;
  estado: string;
  distancia_km?: number | null;
  latitud?: number | null;
  longitud?: number | null;
}

export interface ClubConDisponibilidad extends Club {
  horarios_hoy?: string[];
  precio_desde?: number | null;
}
