import React from "react";

interface BrandIsotypeProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  iconClassName?: string;
}

const SIZE_MAP = {
  sm: {
    container: "size-9 rounded-xl shadow-[0_0_15px_rgba(204,255,0,0.18)]",
    icon: "w-[23px] h-auto",
  },
  md: {
    container: "size-10 rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.22)]",
    icon: "w-[26px] h-auto",
  },
  lg: {
    container: "size-11 rounded-xl shadow-[0_0_22px_rgba(204,255,0,0.25)]",
    icon: "w-[29px] h-auto",
  },
  xl: {
    container: "size-12 rounded-2xl shadow-[0_0_25px_rgba(204,255,0,0.3)]",
    icon: "w-[32px] h-auto",
  },
};

/**
 * Isotipo oficial Padel Nexus («pa»).
 * Renderiza el recuadro redondeado verde neón (#cbfe01) con el isotipo negro
 * perfectamente centrado con precisión subpixel (sin márgenes ni desfases asimétricos).
 */
export default function BrandIsotype({
  size = "md",
  className = "",
  iconClassName = "",
}: BrandIsotypeProps) {
  const config = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`bg-[#cbfe01] flex items-center justify-center shrink-0 select-none ${config.container} ${className}`}
      aria-label="Padel Nexus"
      role="img"
    >
      <svg
        viewBox="33.3 56.45 52.94 32.88"
        className={`${config.icon} ${iconClassName}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M80.84,57.37v1.5c-2-1.4-4.58-2.24-7.73-2.18-5.01.09-6.04,2.24-9.56,4.47-4.74,3-7.19-2.12-11.12-3.58-3.04-1.13-6.37-1.11-9.3.1-1.43.53-2.69,1.27-3.78,2.24v-2.48h-6.05v31.89h6.1v-10.1c1.24,1.11,2.77,1.89,4.45,2.4.05.02.1.05.15.07,3.42,1.03,7.08.64,10.36-1.22,3.11-1.76,4.31-4.92,8.62-2.93,3.14,1.45,4.02,4.17,8.64,4.63,3.84.38,6.92-.46,9.22-2.04v1.27h5.4v-24.06h-5.4ZM59.11,71.48c-5.58.66-7.25,6.58-13.3,4.96-.57-.15-1.25-.42-1.92-.75-1.22-.71-2.9-1.94-3.54-2.97-.71-1.14-.9-1.71-.9-3.13s.36-2.69,1.07-3.83c.71-1.14,1.68-2.03,2.9-2.68.71-.49,1.77-.73,2.82-.82,7.22-.64,8.15,7.16,16.97,5.08,3.91-.92,5.81-4.59,9.13-4.89,10.22-.92,10.91,13.19,1.99,14.22-5.89.68-7.43-6.11-15.24-5.19Z"
          fill="#0b0b0b"
        />
      </svg>
    </div>
  );
}
