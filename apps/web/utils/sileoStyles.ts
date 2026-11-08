/** Estilos compartidos para toasts sileo (PUB-11: sin capitalize en cada palabra). */
export const sileoToastTitleClass = "!text-white !font-bold !normal-case";
export const sileoToastDescriptionClass = "!text-gray-300 !normal-case";

export const sileoToastStyles = {
  title: sileoToastTitleClass,
  description: sileoToastDescriptionClass,
  badge: "!bg-[#cbfe01] !text-black",
} as const;
