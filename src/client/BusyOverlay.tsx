/**
 * Shared overlay for an operation in progress. The caller provides translated
 * text and controls visibility, including refresh waits and timeout behavior.
 * Hiding the overlay alone does not establish that a write or refresh succeeded.
 *
 * @module dsh-connect-trae/client/BusyOverlay
 */

import type { ReactElement } from 'react'

/** Props: the veil's message, whether it is showing, and an optional detail line. */
export interface BusyOverlayProps {
  /** The scenario line, already translated by the caller (e.g. "Saving…"). */
  message: string
  /** Extra detail under the message, already translated; omitted when absent. */
  hint?: string
  /**
   * Whether the veil is up. Rendering nothing while false keeps the common
   * resting case free of an invisible layer that would still eat clicks.
   */
  visible: boolean
}

/**
 * The shared busy veil's spinner: an arc that breathes while it turns.
 *
 * Deliberately the host's own state-spinner shape (dsh's `_dsh-state-dot-spin`)
 * rather than a border-ring: a two-tone CSS ring at .7s read as a loading
 * indicator from another decade and was out of step with every spinner in the
 * shell. The motion lives in CSS (`dsm-trae-veil-spin` / `-dash`), so this
 * element only describes the geometry; `currentColor` lets it inherit whatever
 * tier it sits in.
 *
 * `aria-hidden` because the veil's `role="status"` already announces the
 * message — a second announcement from a decorative arc is noise.
 */
function VeilSpinner(): ReactElement {
  return (
    <svg className="dsm-trae-veil-spinner" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle className="dsm-trae-veil-spinner-track" cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle className="dsm-trae-veil-spinner-arc" cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The veil has no focusable control or dismissal button. It announces the
 * caller's message through a polite status region and marks the region busy.
 * The caller controls completion and timeout handling.
 */
export function BusyOverlay({ message, hint, visible }: BusyOverlayProps): ReactElement | null {
  if (!visible) return null
  return (
    <div className="dsm-trae-veil" role="status" aria-busy="true" aria-live="polite">
      <div className="dsm-trae-veil-card">
        <VeilSpinner />
        <span className="dsm-trae-veil-text">{message}</span>
        {hint === undefined ? null : <span className="dsm-trae-veil-hint">{hint}</span>}
      </div>
    </div>
  )
}
