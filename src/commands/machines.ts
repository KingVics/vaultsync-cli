import { Command } from 'commander'
import { createInterface } from 'readline'
import { loadConfig } from '../config.js'

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`${message} (y/N) `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

// ── Shared fetch helper ───────────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown) {
  const { serverUrl, apiKey } = loadConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  const res = await fetch(`${serverUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
  const json = await res.json() as Record<string, unknown>
  if (!res.ok) {
    throw new Error((json.error as string) ?? `Server returned ${res.status}`)
  }
  return json
}

// ── Commands ──────────────────────────────────────────────────────────────────

export const machinesCmd = new Command('machine')
  .description('Manage machine identities')

machinesCmd
  .command('create')
  .description('Register a new machine and get its one-time enrollment token')
  .requiredOption('--name <n>', 'Machine name (lowercase, hyphens only — e.g. production-01)')
  .action(async (opts) => {
    try {
      const result = await api('POST', '/machines', { name: opts.name })
      console.log(`\n✓ Machine "${result.machine_name}" created\n`)
      console.log(`  Enrollment Token (OTET):`)
      console.log(`  ${result.otet}`)
      console.log(`\n  Expires: ${result.expires_at}`)
      console.log(`\n  Run on your VPS:`)
      console.log(`  vaultsync enroll ${result.otet}\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

machinesCmd
  .command('list')
  .description('List all enrolled machines')
  .action(async () => {
    try {
      const result = await api('GET', '/machines')
      const rows = result.machines as Array<{
        id: string; name: string; status: string; enrolledAt: string
      }>

      if (rows.length === 0) {
        console.log('No machines enrolled yet. Run: vaultsync machine create --name <n>')
        return
      }

      console.log(`\n${'NAME'.padEnd(24)} ${'STATUS'.padEnd(10)} ${'ENROLLED'.padEnd(28)} ID`)
      console.log('-'.repeat(90))
      for (const m of rows) {
        const enrolled = new Date(m.enrolledAt).toLocaleString()
        const status = m.status === 'active' ? '● active' : '○ revoked'
        console.log(`${m.name.padEnd(24)} ${status.padEnd(10)} ${enrolled.padEnd(28)} ${m.id}`)
      }
      console.log()
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

machinesCmd
  .command('revoke')
  .description('Revoke a machine — all future secret fetches will be rejected')
  .requiredOption('--id <machineId>', 'Machine ID (from vaultsync machine list)')
  .action(async (opts) => {
    try {
      const result = await api('PATCH', `/machines/${opts.id}/revoke`)
      console.log(`✓ ${result.message}`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

machinesCmd
  .command('delete')
  .description('Permanently delete a machine and all its wrapped keys and access policies')
  .requiredOption('--id <machineId>', 'Machine ID (from vaultsync machine list)')
  .option('--yes', 'Skip confirmation prompt')
  .action(async (opts) => {
    try {
      if (!opts.yes) {
        const ok = await confirm(`Delete machine ${opts.id}? This removes all its access grants.`)
        if (!ok) { console.log('Aborted.'); return }
      }
      const result = await api('DELETE', `/machines/${opts.id}`)
      console.log(`✓ ${result.message}`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })
