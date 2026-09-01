export interface Club {
  id: string;
  nombre: string;
  provincia: string;
  localidad: string;
  direccion?: string;
  canchas: number;
  estado: string;
  distancia_km?: number | null;
}
