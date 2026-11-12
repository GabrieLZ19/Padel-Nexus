import { sileo } from "sileo";
import type { SileoOptions } from "sileo";
import { SILEO_TOAST_DURATION_MS, sileoToastStyles } from "@/utils/sileoStyles";

function mergeToastOptions(opts: SileoOptions): SileoOptions {
  return {
    duration: SILEO_TOAST_DURATION_MS,
    styles: sileoToastStyles,
    ...opts,
    styles: { ...sileoToastStyles, ...opts.styles },
  };
}

/** Toast de éxito con estilos y duración por defecto del proyecto. */
export function toastExito(opts: SileoOptions): string {
  return sileo.success(mergeToastOptions(opts));
}

/** Toast de error con estilos y duración por defecto del proyecto. */
export function toastError(opts: SileoOptions): string {
  return sileo.error(mergeToastOptions(opts));
}

/** Toast informativo con estilos y duración por defecto del proyecto. */
export function toastInfo(opts: SileoOptions): string {
  return sileo.info(mergeToastOptions(opts));
}

/** Toast de advertencia con estilos y duración por defecto del proyecto. */
export function toastAviso(opts: SileoOptions): string {
  return sileo.warning(mergeToastOptions(opts));
}
