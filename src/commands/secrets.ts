import { Command } from 'commander'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { createCipheriv, randomBytes } from 'crypto'
import { homedir } from 'os'
import { join } from 'path'
import { loadConfig } from '../config.js'

// ── Key store ─────────────────────────────────────────────────────────────────
// AES keys are stored locally at ~/.vaultsync/keys/<label>__<env>.key (hex)
// They NEVER leave the developer machine in plaintext.
// The `grant` command reads them to produce per-machine wrapped keys.

const keysDir = join(homedir(), '.vaultsync', 'keys')

function keyPath(label: string, environment: string): string {
  // Sanitise to safe filename: "API-Backend__Production.key"
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9-_]/g, '_')
  return join(keysDir, `${safe(label)}__${safe(environment)}.key`)
}

function saveKey(label: string, environment: string, key: Buffer): void {
  if (!existsSync(keysDir)) mkdirSync(keysDir, { recursive: true })
  writeFileSync(keyPath(label, environment), key.toString('hex'), { mode: 0o600 })
}

export function loadKey(label: string, environment: string): Buffer {
  const path = keyPath(label, environment)
  if (!existsSync(path)) {
    throw new Error(
      `No local AES key found for "${label}" / "${environment}".\n` +
      `  Did you push this secret? Run: vaultsync secrets push --label "${label}" --env "${environment}" --file <path>`
    )
  }
  return Buffer.from(readFileSync(path, 'utf8').trim(), 'hex')
}

// ── Encryption ────────────────────────────────────────────────────────────────

function encryptBlob(plaintext: Buffer): {
  ciphertext: Buffer
  key: Buffer
  iv: Buffer
  authTag: Buffer
} {
  const key = randomBytes(32)   // AES-256
  const iv  = randomBytes(12)   // GCM standard 96-bit nonce
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  return { ciphertext, key, iv, authTag }
}

// ── API helper ────────────────────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown, query?: Record<string, string>) {
  const { serverUrl, apiKey } = loadConfig()
  const url = new URL(`${serverUrl}${path}`)
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json() as Record<string, unknown>
  if (!res.ok) throw new Error((json.error as string) ?? `Server returned ${res.status}`)
  return json
}

// ── Commands ──────────────────────────────────────────────────────────────────

export const secretsCmd = new Command('secrets')
  .description('Manage secret blobs')

secretsCmd
  .command('push')
  .description('Encrypt a .env file and push the ciphertext to the vault')
  .requiredOption('--label <label>',     'Secret label (e.g. API-Backend)')
  .requiredOption('--env <environment>', 'Environment (e.g. Production, Staging)')
  .requiredOption('--file <path>',       'Path to .env file to encrypt and push')
  .action(async (opts) => {
    try {
      // 1. Read and encrypt locally
      const plaintext = readFileSync(opts.file)
      const { ciphertext, key, iv, authTag } = encryptBlob(plaintext)

      // 2. Persist AES key locally — never sent to server
      saveKey(opts.label, opts.env, key)
      console.log(`✓ AES key saved to ~/.vaultsync/keys/ (never leaves this machine)`)

      // 3. Push ciphertext to server
      const result = await api('POST', '/secrets', {
        label:       opts.label,
        environment: opts.env,
        ciphertext:  ciphertext.toString('base64'),
        iv:          iv.toString('base64'),
        auth_tag:    authTag.toString('base64'),
      })

      console.log(`\n✓ Secret pushed`)
      console.log(`  Blob ID:     ${result.blob_id}`)
      console.log(`  Label:       ${result.label}`)
      console.log(`  Environment: ${result.environment}`)
      console.log(`  Version:     ${result.version}`)
      console.log(`\n  ${result.note}`)
      console.log(`\n  Next: vaultsync grant --machine <name> --label ${opts.label} --env ${opts.env}\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

secretsCmd
  .command('list')
  .description('List all secret blobs in the vault')
  .option('--label <label>',     'Filter by label')
  .option('--env <environment>', 'Filter by environment')
  .action(async (opts) => {
    try {
      const query: Record<string, string> = {}
      if (opts.label) query.label = opts.label
      if (opts.env)   query.environment = opts.env

      const result = await api('GET', '/secrets', undefined, query)
      const blobs = result.blobs as Array<{
        id: string; label: string; environment: string; version: number; createdAt: string
      }>

      if (blobs.length === 0) {
        console.log('No secrets found. Run: vaultsync secrets push --label <l> --env <e> --file .env')
        return
      }

      console.log(`\n${'LABEL'.padEnd(24)} ${'ENV'.padEnd(16)} ${'VER'.padEnd(6)} ${'CREATED'.padEnd(28)} ID`)
      console.log('-'.repeat(100))
      for (const b of blobs) {
        const created = new Date(b.createdAt).toLocaleString()
        console.log(
          `${b.label.padEnd(24)} ${b.environment.padEnd(16)} ${String(b.version).padEnd(6)} ${created.padEnd(28)} ${b.id}`
        )
      }
      console.log()
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

secretsCmd
  .command('delete')
  .description('Delete a secret blob and all associated access grants')
  .requiredOption('--id <blobId>', 'Blob ID (from vaultsync secrets list)')
  .action(async (opts) => {
    try {
      const result = await api('DELETE', `/secrets/${opts.id}`)
      console.log(`✓ ${result.message}`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })
