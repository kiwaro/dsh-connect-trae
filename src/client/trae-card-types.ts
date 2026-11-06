import type { TraeSettingsKey } from './locales.ts'

/** Localized copy injected by the browser-plugin registration. */
export interface TraeUsageCardInjected {
  t: (key: TraeSettingsKey, params?: Record<string, unknown>) => string
  /**
   * Optional by design: before the configForms mirror populates (or on a host
   * with no settings surface) this is undefined, and the card renders
   * read-only — saving is the only capability that needs it.
   */
  settingsScope?: {
    getSnapshot(): { status: string; value?: unknown; writable: boolean }
    subscribe(listener: () => void): () => void
    /** Whether the Host accepted the write. */
    set(field: string, value: unknown): Promise<boolean>
  }
}

/**
 * Props delivered by the Plugin configuration item slots
 * (`plugins.bundle.config` / `plugins.row.config`). The type is structural on
 * purpose: the slot names are declared by the host app bundle, not by any
 * package in the plugin's own tree, so referencing a named slot contract here
 * would fail to resolve in the plugin's dev environment.
 */
export type TraeUsageCardProps = Partial<TraeUsageCardInjected> & {
  /** The plugin manager asks for one of two views through its owner props.
   * `page` is the full form with its own save control; `summary` is a
   * one-liner. An absent `view` starts the card collapsed. */
  view?: 'summary' | 'page'
  /**
   * Which SURFACE this card is drawn on.
   *
   * `card` (the default) is the collapsible `<li>` the Plugins page renders.
   * `page` is the full-page body behind the OPTIONAL sidebar row
   * (`sidebar.panellist` + `main`): a page has no card chrome to collapse, so
   * it always renders expanded and draws its own header instead.
   *
   * `section` is the `settings.section` page — the configuration entry this
   * plugin now ships. It is a THIRD surface, not a reuse of `page`, because the
   * settings shell already owns the chrome a page has to draw for itself: it
   * paints the panel, the nav row, the close control and the scroll column, and
   * hands the section only `{ close }`. Drawing the page's "back to
   * conversation" header there would offer a second, competing way out of a
   * modal that is not a centre-column panel. What a section still wants is to
   * say what it is, which `section` does with a heading and the one-line
   * description instead of a back button.
   *
   * The distinction is a prop rather than three components because the body
   * must stay ONE tree: the region tabs, the polling, the drafts and the pool
   * log are identical on every surface, and a second component would be a copy
   * that drifts.
   */
  surface?: 'card' | 'page' | 'section'
  /** Back to the conversation, offered by the page header. Supplied by the
   * browser entry (it soft-probes the host's `layout` service); absent on a
   * host that does not declare one, and the affordance is then omitted rather
   * than drawn dead. */
  backToConversation?: () => void
}
