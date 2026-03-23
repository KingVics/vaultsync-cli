import { Command } from 'commander'
import { SERVER_URL, saveConfig } from '../config.js'

export const registerCmd = new Command('register')
  .description('Create your account (use --invite if the server requires an invite code)')
  .requiredOption('--name <name>', 'Your username (alphanumeric, hyphens, underscores)')
  .option('--invite <code>', 'Invite code provided by the server owner')
  .action(async (opts) => {
    try {
      const body: Record<string, string> = { name: opts.name }
      if (opts.invite) body.invite_code = opts.invite

      const res = await fetch(`${SERVER_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      })

      const json = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error((json.error as string) ?? `Server returned ${res.status}`)

      // Auto-login — save credentials immediately so the user is ready to go
      saveConfig(json.api_key as string)

      console.log(`\n✓ Account created and logged in — welcome, ${json.name}!`)
      console.log(`\n  API Key: ${json.api_key}`)
      console.log(`  ⚠ Save this key — it will never be shown again.\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })
