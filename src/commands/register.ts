import { Command } from 'commander'
import { SERVER_URL } from '../config.js'

export const registerCmd = new Command('register')
  .description('Create your account using a one-time invite code')
  .requiredOption('--invite <code>', 'Invite code provided by the server owner')
  .requiredOption('--name <name>', 'Your username (alphanumeric, hyphens, underscores)')
  .action(async (opts) => {
    try {
      const res = await fetch(`${SERVER_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: opts.invite, name: opts.name }),
      })

      const json = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error((json.error as string) ?? `Server returned ${res.status}`)

      console.log(`\n✓ Account created — welcome, ${json.name}!`)
      console.log(`\n  API Key: ${json.api_key}`)
      console.log(`\n  ⚠ Save this key — it will never be shown again.`)
      console.log(`\n  Log in now:`)
      console.log(`  vaultsync login --key ${json.api_key}\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })
