const VIEWPORT_MARGIN = 12;
const PANEL_WIDTH_SM = 320;
const PANEL_WIDTH_MD = 384;

export type NotificationDropdownAnchor = {
  top: number;
  left?: number;
  right?: number;
};

function panelWidthForViewport(viewportWidth: number): number {
  return viewportWidth >= 768 ? PANEL_WIDTH_MD : PANEL_WIDTH_SM;
}

/** ENZO-1 / RES-15: evita que el panel quede fuera del viewport a la izquierda. */
export function computeNotificationDropdownPosition(
  rect: Pick<DOMRect, "top" | "bottom" | "left" | "right">,
  viewportWidth: number,
): NotificationDropdownAnchor {
  const panelWidth = panelWidthForViewport(viewportWidth);
  const top = rect.bottom + 12;
  const panelLeftIfRightAligned = rect.right - panelWidth;

  if (panelLeftIfRightAligned >= VIEWPORT_MARGIN) {
    return { top, right: viewportWidth - rect.right };
  }

  let left = Math.max(VIEWPORT_MARGIN, rect.left);
  const maxLeft = viewportWidth - VIEWPORT_MARGIN - panelWidth;
  if (left > maxLeft) {
    left = Math.max(VIEWPORT_MARGIN, maxLeft);
  }
  return { top, left };
}