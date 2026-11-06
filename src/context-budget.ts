/**
 * Context-budget arithmetic shared by the HOST (which applies a saved budget to
 * the catalog DSH is told about) and the CLIENT card (which renders the radios).
 *
 * It lives in its own module because the client bundle cannot import
 * `catalog.ts` (host-only) and the two sides must agree EXACTLY on which
 * windows are selectable: a card that offers a window the host then refuses
 * would be a control that silently does nothing.
 */

/**
 * Intermediate local context budget of 500,000 tokens. Offered only when it is
 * strictly wider than the dev window and strictly narrower than the Max window.
 * This controls DSH's local compression threshold, not an upstream window or
 * pricing guarantee. applyContextBudgets clamps saved values to advertised limits.
 */
export const TRAE_CONTEXT_BUDGET_MID = 500_000

/** The only fields {@link contextBudgetOptions} reads. */
export interface TraeContextWindows {
  contextWindow?: number
  maxContextWindow?: number
}

/**
 * The selectable windows for one model, smallest first: dev, then 500K (only
 * when it is a genuine middle step), then Max. Duplicates are dropped so a
 * model whose dev window is already 500K offers it once.
 *
 * A model with no Max window yields exactly one option — its dev window — which
 * is what makes the card's radios read-only for such models.
 */
export function contextBudgetOptions(model: TraeContextWindows): number[] {
  const dev = model.contextWindow
  const max = model.maxContextWindow
  const options: number[] = []
  const push = (value: number | undefined): void => {
    if (value === undefined || value < 1) return
    if (!options.includes(value)) options.push(value)
  }
  push(dev)
  // Only when it is a genuine step between the two: strictly wider than dev
  // (equal would duplicate the dev option) and no wider than Max (equal would
  // duplicate the Max option).
  if (max !== undefined && max >= TRAE_CONTEXT_BUDGET_MID && (dev === undefined || TRAE_CONTEXT_BUDGET_MID > dev)) {
    push(TRAE_CONTEXT_BUDGET_MID)
  }
  push(max)
  return options.sort((left, right) => left - right)
}
