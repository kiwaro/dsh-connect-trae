import type { TraeAccountEvent } from './status-paths.ts'
import type { TraePanel } from './region.ts'

/** Keep local diagnostics useful without returning credentials in upstream errors. */
export function safeAccountMessage(value: unknown): string {
  return (value instanceof Error ? value.message : String(value))
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[redacted token]')
    .replace(/(\b(?:authorization\s*[:=]\s*(?:bearer\s+)?|bearer\s+))[^\s,;"']+/giu, '$1[redacted]')
    .replace(/(\bcookie\s*:\s*)[^\r\n]+/giu, '$1[redacted]')
    .replace(/(\b(?:token|refresh[_-]?token|access[_-]?token|cookie|code)["']?\s*[=:]\s*["']?)[^&\s,;"']+/giu, '$1[redacted]')
    .slice(0, 500)
}

/** Session-local, bounded history. Panels never share account activity. */
export class TraeAccountEvents {
  private sequence = 0
  private readonly panels: Record<TraePanel, TraeAccountEvent[]> = { cn: [], enterprise: [], ai: [] }

  add(panel: TraePanel, event: Pick<TraeAccountEvent, 'tone' | 'text'>): void {
    const rows = this.panels[panel]
    rows.push({ ...event, text: safeAccountMessage(event.text), id: ++this.sequence, atMs: Date.now() })
    if (rows.length > 30) rows.splice(0, rows.length - 30)
  }

  read(panel: TraePanel): TraeAccountEvent[] {
    return this.panels[panel].map(row => ({ ...row }))
  }
}
