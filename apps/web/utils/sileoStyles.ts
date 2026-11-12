/** Estilos compartidos para toasts sileo (PUB-11: sin capitalize en cada palabra). */
export const sileoToastTitleClass = "!text-white !font-bold !normal-case";
export const sileoToastDescriptionClass = "!text-gray-300 !normal-case";

/** Cierre automático por defecto en confirmaciones breves (p. ej. guardar perfil). */
export const SILEO_TOAST_DURATION_MS = 5000;

export const sileoToastStyles = {
  title: sileoToastTitleClass,
  description: sileoToastDescriptionClass,
  badge: "!bg-[#cbfe01] !text-black",
} as const;
