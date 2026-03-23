import { Command } from 'commander'
import { loadConfig, SERVER_URL } from '../config.js'

export const verifyCmd = new Command('verify')
  .description('Verify server connection and authentication')
  .action(async () => {
    console.log()

    // 1. Server health
    process.stdout.write('→ Checking server... ')
    try {
      const res  = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(8000) })
      const json = await res.json() as { status: string; ts: string }
      if (json.status === 'ok') {
        console.log(`✓  (${json.ts})`)
      } else {
        console.log(`⚠ unhealthy — DB or Redis may be down`)
        process.exit(1)
      }
    } catch (err) {
      console.log(`✗ unreachable`)
      console.error(`  ${(err as Error).message}`)
      console.error(`  Make sure VAULTSYNC_SERVER is set correctly`)
      process.exit(1)
    }

    // 2. Auth
    process.stdout.write('→ Verifying API key... ')
    try {
      const { serverUrl, apiKey } = loadConfig()
      const res = await fetch(`${serverUrl}/machines`, {
        headers: { 'x-api-key': apiKey },
        signal:  AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const json = await res.json() as { machines: Array<{ name: string; status: string }> }
        console.log(`✓`)
        console.log(`\n✓ Authenticated`)
        if (json.machines.length > 0) {
          console.log(`\n  Enrolled machines:`)
          for (const m of json.machines) {
            const icon = m.status === 'active' ? '●' : '○'
            console.log(`    ${icon} ${m.name} (${m.status})`)
          }
        } else {
          console.log(`\n  No machines enrolled yet.`)
          console.log(`  Run: vaultsync machine create --name <name>`)
        }
      } else if (res.status === 401) {
        console.log(`✗ Unauthorized`)
        console.error(`  Your API key is invalid or expired.`)
        console.error(`  Run: vaultsync login --key <key>`)
        process.exit(1)
      } else {
        console.log(`⚠ Unexpected status ${res.status}`)
        process.exit(1)
      }
    } catch (err) {
      if ((err as Error).message.includes('Not logged in')) {
        console.log(`✗`)
        console.error(`  Not logged in. Run: vaultsync login --key <key>`)
      } else {
        console.log(`✗`)
        console.error(`  ${(err as Error).message}`)
      }
      process.exit(1)
    }

    console.log()
  })
