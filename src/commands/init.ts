import { Command } from 'commander'
import { createInterface } from 'readline'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { saveConfig, SERVER_URL } from '../config.js'

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

export const initCmd = new Command('init')
  .description('Interactive setup — configure server URL and API key')
  .action(async () => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })

    console.log('\nVaultSync Setup')
    console.log('─'.repeat(30))

    const serverInput = await ask(rl, `\nServer URL [${SERVER_URL}]: `)
    const server      = serverInput.trim() || SERVER_URL

    const apiKey = (await ask(rl, 'API key (vs_... or vps_ad...): ')).trim()
    rl.close()

    if (!apiKey.startsWith('vs_') && !apiKey.startsWith('vps_ad')) {
      console.error('\n✗ Invalid API key format — user keys start with vs_, admin keys start with vps_ad')
      process.exit(1)
    }

    // Persist VAULTSYNC_SERVER for this session and advise on shell profile
    process.env.VAULTSYNC_SERVER = server
    saveConfig(apiKey)

    // Test connection
    process.stdout.write('\n→ Testing connection... ')
    try {
      const res = await fetch(`${server}/health`, { signal: AbortSignal.timeout(8000) })
      const json = await res.json() as { status: string }
      if (json.status === 'ok') {
        console.log('✓')
      } else {
        console.log('⚠ server returned non-ok status')
      }
    } catch {
      console.log('⚠ could not reach server')
      console.log('  Set VAULTSYNC_SERVER in your shell profile and re-run init')
    }

    console.log('✓ Credentials saved to ~/.vaultsync/config.json')

    // Offer to create .vaultsync.yml
    const rl2   = createInterface({ input: process.stdin, output: process.stdout })
    const label = (await ask(rl2, '\nDefault secret label for this project (leave blank to skip): ')).trim()
    const env   = label ? (await ask(rl2, 'Default environment: ')).trim() : ''
    rl2.close()

    if (label && env) {
      const ymlPath = join(process.cwd(), '.vaultsync.yml')
      if (!existsSync(ymlPath)) {
        writeFileSync(ymlPath, `# VaultSync project config\nlabel: "${label}"\nenv: "${env}"\n`)
        console.log(`✓ Created .vaultsync.yml (add to .gitignore if it contains sensitive names)`)
      }
    }

    console.log('\nNext steps:')
    console.log('  vaultsync secrets push --file .env')
    console.log('  vaultsync machine create --name <name>')
    console.log('  vaultsync doctor          # verify everything looks good\n')
  })
