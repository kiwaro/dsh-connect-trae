/** Cross-platform, read-only DSH process detection for the build warning. */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function liveHosts(platform = process.platform, run = execFileAsync) {
  try {
    // Windows has no POSIX ps. Query names as well as command lines because
    // the packaged desktop process need not carry the CLI host entry path.
    const command = platform === 'win32' ? 'powershell.exe' : 'ps'
    const args = platform === 'win32'
      ? ['-NoProfile', '-NonInteractive', '-Command',
          "Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and ($_.Name -eq 'DeepSeek Harness.exe' -or $_.CommandLine -match 'dsh-desktop-host|dsh[\\\\/]lib[\\\\/]bin\\.js') } | ForEach-Object { $_.Name + ' ' + $_.CommandLine }"]
      : ['-Ao', 'command']
    const { stdout } = await run(command, args, { maxBuffer: 8 * 1024 * 1024, timeout: 15000, windowsHide: true })
    return stdout.split(/\r?\n/).filter(line =>
      /dsh-desktop-host|dsh[\\/]lib[\\/]bin\.js/.test(line)
      || (platform === 'win32' && /^DeepSeek Harness\.exe(?:\s|$)/i.test(line)),
    )
  } catch {
    // Detection remains advisory: a missing process utility cannot block builds.
    return []
  }
}
