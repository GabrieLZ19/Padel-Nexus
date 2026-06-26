/**
 * Validaciones centralizadas de campos de formulario para Padel Nexus
 */

/**
 * Valida que el nombre o apellido no contenga números y tenga una longitud apropiada.
 * Admite caracteres en español, espacios, guiones y apóstrofes.
 */
export const validateNombre = (val: string): boolean => {
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,50}$/.test(val.trim());
};

/**
 * Valida el formato del DNI de Argentina.
 * Admite 7 u 8 dígitos, con o sin separación por puntos (ej: 40234567 o 40.234.567).
 */
export const validateDni = (val: string): boolean => {
  return /^(?:\d{1,2}\.?\d{3}\.?\d{3}|\d{7,8})$/.test(val.trim());
};

/**
 * Valida el número de teléfono (nacional o internacional).
 * Permite números con formato estándar, espacios, guiones y paréntesis.
 * Se asegura de que contenga al menos 10 dígitos y un máximo de 15 dígitos reales.
 */
export const validateTelefono = (val: string): boolean => {
  const cleanVal = val.trim();
  const digitsOnly = cleanVal.replace(/\D/g, "");
  return (
    digitsOnly.length >= 10 &&
    digitsOnly.length <= 15 &&
    /^\+?[0-9\s\-()]{10,20}$/.test(cleanVal)
  );
};
