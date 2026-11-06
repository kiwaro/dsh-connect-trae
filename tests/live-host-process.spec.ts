import { describe, expect, it, vi } from 'vitest'

const moduleUrl = new URL('../scripts/live-host-process.mjs', import.meta.url).href
const { liveHosts } = await import(moduleUrl)

describe('build warning process detection', () => {
  it('queries Windows processes without POSIX ps and recognizes packaged and CLI hosts', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: [
      'DeepSeek Harness.exe "C:\\Program Files\\DeepSeek Harness.exe"',
      'node.exe C:\\runtime\\dsh\\lib\\bin.js',
      'node.exe C:\\runtime\\@deepseek-ai\\dsh-desktop-host\\lib\\index.js',
      'node.exe C:\\unrelated\\index.js',
      '',
    ].join('\r\n') })
    expect(await liveHosts('win32', run)).toHaveLength(3)
    expect(run).toHaveBeenCalledWith('powershell.exe', expect.arrayContaining(['-NoProfile', '-NonInteractive']),
      expect.objectContaining({ windowsHide: true, timeout: 15000 }))
    expect(run.mock.calls[0]![1].join(' ')).toContain('Get-CimInstance Win32_Process')
  })

  it('keeps POSIX host detection and ignores unrelated processes', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: 'node /app/dsh/lib/bin.js\nnode /app/dsh-desktop-host/lib/index.js\nnode /app/other.js\n' })
    expect(await liveHosts('linux', run)).toHaveLength(2)
    expect(run).toHaveBeenCalledWith('ps', ['-Ao', 'command'], expect.any(Object))
  })

  it('does not block builds when process detection is unavailable', async () => {
    const run = vi.fn().mockRejectedValue(new Error('access denied'))
    expect(await liveHosts('win32', run)).toEqual([])
  })
})
