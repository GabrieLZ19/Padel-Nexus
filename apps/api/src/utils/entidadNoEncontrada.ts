export class EntidadNoEncontradaError extends Error {
  readonly statusCode = 404;

  constructor(entidad: string) {
    super(`${entidad} no encontrada.`);
    this.name = "EntidadNoEncontradaError";
  }
}