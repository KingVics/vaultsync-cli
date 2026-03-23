import { Command } from 'commander'
import { loadConfig } from '../config.js'

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
  if (!res.ok) throw new Error((json.error as string) ?? `Server returned ${res.status}`)
  return json
}

export const adminCmd = new Command('admin')
  .description('Server administration (requires master API key)')

const userCmd = new Command('user').description('Manage users')
adminCmd.addCommand(userCmd)

userCmd
  .command('create')
  .description('Create a new user and return their API key')
  .requiredOption('--name <name>', 'Username (alphanumeric, hyphens, underscores)')
  .action(async (opts) => {
    try {
      const result = await api('POST', '/admin/users', { name: opts.name })
      console.log(`\n✓ User "${result.name}" created`)
      console.log(`\n  API Key: ${result.api_key}`)
      console.log(`\n  ⚠ Save this key — it will never be shown again.`)
      console.log(`\n  Share with user:`)
      console.log(`  vaultsync login --key ${result.api_key}\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

userCmd
  .command('list')
  .description('List all users')
  .action(async () => {
    try {
      const result = await api('GET', '/admin/users')
      const rows = result.users as Array<{ id: string; name: string; active: boolean; createdAt: string }>

      if (rows.length === 0) {
        console.log('No users yet. Run: vaultsync admin user create --name <name>')
        return
      }

      console.log(`\n${'NAME'.padEnd(24)} ${'STATUS'.padEnd(12)} ${'CREATED'.padEnd(28)} ID`)
      console.log('-'.repeat(90))
      for (const u of rows) {
        const status  = u.active ? '● active' : '○ inactive'
        const created = new Date(u.createdAt).toLocaleString()
        console.log(`${u.name.padEnd(24)} ${status.padEnd(12)} ${created.padEnd(28)} ${u.id}`)
      }
      console.log()
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

userCmd
  .command('deactivate')
  .description('Deactivate a user — blocks access without deleting their data')
  .requiredOption('--id <userId>', 'User ID (from vaultsync admin user list)')
  .action(async (opts) => {
    try {
      const result = await api('PATCH', `/admin/users/${opts.id}/deactivate`)
      console.log(`✓ ${result.message}`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

userCmd
  .command('activate')
  .description('Re-activate a previously deactivated user')
  .requiredOption('--id <userId>', 'User ID (from vaultsync admin user list)')
  .action(async (opts) => {
    try {
      const result = await api('PATCH', `/admin/users/${opts.id}/activate`)
      console.log(`✓ ${result.message}`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

userCmd
  .command('reset-key')
  .description('Reset a user\'s API key — old key is immediately revoked')
  .requiredOption('--id <userId>', 'User ID (from vaultsync admin user list)')
  .action(async (opts) => {
    try {
      const result = await api('POST', `/admin/users/${opts.id}/reset-key`)
      console.log(`\n✓ API key reset for "${result.name}"`)
      console.log(`\n  New API Key: ${result.api_key}`)
      console.log(`  ⚠ Old key is immediately revoked. Save this — it will never be shown again.`)
      console.log(`\n  Share with user:`)
      console.log(`  vaultsync login --key ${result.api_key}\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

userCmd
  .command('delete')
  .description('Permanently delete a user and all their data')
  .requiredOption('--id <userId>', 'User ID (from vaultsync admin user list)')
  .option('--yes', 'Skip confirmation prompt')
  .action(async (opts) => {
    try {
      if (!opts.yes) {
        const { createInterface } = await import('readline')
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const ok = await new Promise<boolean>(resolve => {
          rl.question(`Delete user ${opts.id} and ALL their machines/secrets? (y/N) `, a => {
            rl.close()
            resolve(a.toLowerCase() === 'y')
          })
        })
        if (!ok) { console.log('Aborted.'); return }
      }
      const result = await api('DELETE', `/admin/users/${opts.id}`)
      console.log(`✓ ${result.message}`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

// ── Invite subcommands ────────────────────────────────────────────────────────

const inviteCmd = new Command('invite').description('Manage invite codes')
adminCmd.addCommand(inviteCmd)

inviteCmd
  .command('create')
  .description('Generate a one-time invite code to share with a new user')
  .option('--expires-hours <hours>', 'Expiry in hours (1–168, default 24)', '24')
  .action(async (opts) => {
    try {
      const result = await api('POST', '/admin/invites', { expires_hours: Number(opts.expiresHours) })
      console.log(`\n✓ Invite code created`)
      console.log(`\n  Code:       ${result.invite_code}`)
      console.log(`  Expires in: ${result.expires_in}`)
      console.log(`  Expires at: ${new Date(result.expires_at as string).toLocaleString()}`)
      console.log(`\n  Share with user:`)
      console.log(`  vaultsync register --invite ${result.invite_code} --name <their-name>\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

inviteCmd
  .command('list')
  .description('List all active (unused, unexpired) invite codes')
  .action(async () => {
    try {
      const result = await api('GET', '/admin/invites')
      const rows = result.invites as Array<{ id: string; used: boolean; usedBy: string | null; expiresAt: string; createdAt: string }>

      if (rows.length === 0) {
        console.log('No active invite codes.')
        return
      }

      console.log(`\n${'ID'.padEnd(38)} ${'EXPIRES'.padEnd(28)} USED BY`)
      console.log('-'.repeat(80))
      for (const inv of rows) {
        const expires = new Date(inv.expiresAt).toLocaleString()
        const usedBy  = inv.usedBy ?? '—'
        console.log(`${inv.id.padEnd(38)} ${expires.padEnd(28)} ${usedBy}`)
      }
      console.log()
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

inviteCmd
  .command('delete')
  .description('Revoke an unused invite code')
  .requiredOption('--id <inviteId>', 'Invite ID (from vaultsync admin invite list)')
  .action(async (opts) => {
    try {
      const result = await api('DELETE', `/admin/invites/${opts.id}`)
      console.log(`✓ ${result.message}`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })
