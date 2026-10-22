import type { SVGProps } from "react";

/**
 * Ícono de cancha de pádel vista desde arriba.
 * Compatible con la interfaz y estilos de los íconos de Lucide.
 */
export default function CanchaIcon({
  className = "size-4",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Perímetro exterior de la cancha */}
      <rect x="5" y="2.5" width="14" height="19" rx="1.5" />
      {/* Red central */}
      <line x1="5" y1="12" x2="19" y2="12" />
      {/* Línea de saque superior */}
      <line x1="5" y1="7" x2="19" y2="7" />
      {/* Línea de saque inferior */}
      <line x1="5" y1="17" x2="19" y2="17" />
      {/* Línea central de saque divisoria */}
      <line x1="12" y1="7" x2="12" y2="17" />
    </svg>
  );
}
