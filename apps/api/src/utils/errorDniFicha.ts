export class ErrorDniFichaDuplicado extends Error {
  readonly statusCode = 409;

  readonly otroPerfil: {
    id: string;
    nombre: string | null;
    apellido: string | null;
  };

  constructor(otro: {
    id: string;
    nombre: string | null;
    apellido: string | null;
  }) {
    const etiqueta =
      [otro.apellido, otro.nombre].filter(Boolean).join(", ").trim() ||
      otro.id;
    super(
      `El DNI ya está asignado a otra ficha (${etiqueta}). Revisá el perfil duplicado antes de continuar.`,
    );
    this.name = "ErrorDniFichaDuplicado";
    this.otroPerfil = otro;
  }
}