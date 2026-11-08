import type { TraePanel } from '../region.ts'
import { configuredAccountsOf, nextRegionPool, regionPoolOf, unwrapVolatileDeep } from '../status-paths.ts'
import type { TraeUsageCardInjected } from './trae-card-types.ts'

/**
 * Write one settings field and confirm the value actually landed.
 *
 * `configForms.set()` resolving is NOT proof that anything was stored: a write
 * can be accepted by the transport and still not materialize — a rejected
 * write reloads Host state and merely RETURNS, so the caller's `await`
 * succeeds while the document is unchanged. The form answers with an explicit
 * boolean for exactly this reason.
 *
 * Either way the caller must not report success on an unpersisted write: the
 * user would see the control flip and then silently revert.
 *
 * @throws {TraeSettingsWriteError} when the write was refused or did not land.
 */
export class TraeSettingsWriteError extends Error {
  constructor(field: string, detail?: string) {
    super(detail === undefined || detail === ''
      ? `trae: settings field "${field}" was not persisted by the settings write`
      : `trae: settings field "${field}" was not persisted by the settings write (${detail})`)
    this.name = 'TraeSettingsWriteError'
  }
}

export async function writeSettingsField(
  scope: NonNullable<TraeUsageCardInjected['settingsScope']>,
  field: string,
  value: unknown,
  landed: (readBack: unknown) => boolean,
): Promise<void> {
  const accepted = await scope.set(field, value)
  // The 0.1.7 form answers an explicit boolean: `false` is a refusal.
  if (accepted === false) throw new TraeSettingsWriteError(field, 'the Host refused the write')
  if (!landed(unwrapVolatileDeep(scope.getSnapshot().value))) {
    throw new TraeSettingsWriteError(field)
  }
}

/** Manual selection stops this panel's automatic ranking, retaining its roster.
 * Disable first: a rejected pool write must never report a successful switch.
 * Both writes are verified; sibling panels and model settings are preserved. */
export async function writeManualAccount(
  scope: NonNullable<TraeUsageCardInjected['settingsScope']>,
  panel: TraePanel,
  accountId: string,
): Promise<void> {
  const pool = regionPoolOf(scope.getSnapshot().value, panel)
  if (pool.enabled === true) {
    await writeSettingsField(scope, 'regions',
      nextRegionPool(scope.getSnapshot().value, panel, { ...pool, enabled: false }),
      value => regionPoolOf(value, panel).enabled === false)
  }
  const accounts = configuredAccountsOf(scope.getSnapshot().value)
  await writeSettingsField(scope, 'accounts', { ...accounts, [panel]: accountId },
    value => configuredAccountsOf(value)[panel] === accountId)
}
