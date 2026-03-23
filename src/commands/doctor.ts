import { Command } from 'commander'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { loadConfig, SERVER_URL } from '../config.js'

type Status = 'ok' | 'warn' | 'fail'

function check(status: Status, label: string, detail?: string) {
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✗'
  const line = `  ${icon} ${label}`
  console.log(detail ? `${line}\n      ${detail}` : line)
}

export const doctorCmd = new Command('doctor')
  .description('Check your VaultSync setup for common issues')
  .action(async () => {
    console.log('\nVaultSync Doctor')
    console.log('─'.repeat(30))

    let allOk = true

    // 1. Config file
    const configFile = join(homedir(), '.vaultsync', 'config.json')
    if (existsSync(configFile)) {
      check('ok', 'Config file found (~/.vaultsync/config.json)')
    } else {
      check('fail', 'Config file missing', 'Run: vaultsync login --key <key>  or  vaultsync init')
      allOk = false
    }

    // 2. HTTPS check
    if (!SERVER_URL.startsWith('https://')) {
      check('warn', 'Server URL is not HTTPS', 'Secrets are transmitted over an unencrypted connection — use HTTPS in production')
      allOk = false
    }

    // 3. Server reachable
    try {
      const res  = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(8000) })
      const json = await res.json() as { status: string }
      if (json.status === 'ok') {
        check('ok', 'Server reachable and healthy')
      } else {
        check('warn', 'Server reachable but DB/Redis may be unhealthy', json.status)
        allOk = false
      }
    } catch {
      check('fail', 'Cannot reach server', `Set VAULTSYNC_SERVER=https://your-server.com`)
      allOk = false
    }

    // 4. API key valid (try listing machines)
    try {
      const { serverUrl, apiKey } = loadConfig()
      const res = await fetch(`${serverUrl}/machines`, {
        headers: { 'x-api-key': apiKey },
        signal:  AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const json = await res.json() as { machines: unknown[] }
        check('ok', `API key valid (${json.machines.length} machine${json.machines.length !== 1 ? 's' : ''} registered)`)
      } else if (res.status === 401) {
        check('fail', 'API key rejected — run: vaultsync login --key <key>')
        allOk = false
      } else {
        check('warn', `Unexpected server response: ${res.status}`)
      }
    } catch {
      check('warn', 'Could not validate API key (server unreachable)')
    }

    // 5. Local AES keys
    const keysDir = join(homedir(), '.vaultsync', 'keys')
    if (existsSync(keysDir)) {
      const keys = readdirSync(keysDir).filter(f => f.endsWith('.key'))
      check('ok', `Local AES keys found (${keys.length} secret${keys.length !== 1 ? 's' : ''})`)
      if (keys.length === 0) {
        check('warn', 'No local keys — push a secret: vaultsync secrets push --file .env --label <l> --env <e>')
      }
    } else {
      check('warn', 'No local keys directory — push a secret first')
    }

    // 6. Project config
    const projectYml = join(process.cwd(), '.vaultsync.yml')
    if (existsSync(projectYml)) {
      check('ok', '.vaultsync.yml found in current directory')
    } else {
      check('warn', 'No .vaultsync.yml in current directory', 'Run: vaultsync init  to create one')
    }

    console.log()
    if (allOk) {
      console.log('  Everything looks good.\n')
    } else {
      console.log('  Some checks failed. Fix the issues above and re-run: vaultsync doctor\n')
      process.exit(1)
    }
  })
