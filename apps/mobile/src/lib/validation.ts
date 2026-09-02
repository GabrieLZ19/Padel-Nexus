export function validateNombre(val: string): boolean {
  const trimmed = val.trim();
  return trimmed.length >= 2 && !/\d/.test(trimmed);
}

export function validateDni(val: string): boolean {
  return /^(?:\d{1,2}\.?\d{3}\.?\d{3}|\d{7,8})$/.test(val.trim());
}

export function validateTelefono(val: string): boolean {
  const cleanVal = val.trim();
  if (!cleanVal) return true;
  const digitsOnly = cleanVal.replace(/\D/g, "");
  return (
    digitsOnly.length >= 10 &&
    digitsOnly.length <= 15 &&
    /^\+?[0-9\s\-()]{10,20}$/.test(cleanVal)
  );
}

export function normalizeDni(val: string): string {
  return val.trim().replace(/\./g, "");
}

export function sanitizeTelefonoInput(val: string): string {
  return val.replace(/[^0-9+\s\-()]/g, "");
}

export function sanitizeDniInput(val: string): string {
  return val.replace(/[^0-9.]/g, "").slice(0, 10);
}
