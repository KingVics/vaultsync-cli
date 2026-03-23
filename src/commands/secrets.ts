import { Command } from 'commander'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { createInterface } from 'readline'
import { homedir } from 'os'
import { join } from 'path'
import { loadConfig, loadProjectConfig } from '../config.js'

const SECRET_AGE_WARN_DAYS = 90

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`${message} (y/N) `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

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

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
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
  .option('--label <label>',     'Secret label (e.g. API-Backend)')
  .option('--env <environment>', 'Environment (e.g. Production, Staging)')
  .requiredOption('--file <path>',       'Path to .env file to encrypt and push')
  .action(async (opts) => {
    try {
      const proj  = loadProjectConfig()
      opts.label  = opts.label ?? proj.label
      opts.env    = opts.env   ?? proj.env

      if (!opts.label || !opts.env) {
        console.error('✗ --label and --env are required (or set them in .vaultsync.yml)')
        process.exit(1)
      }

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

      const now = Date.now()
      const warnMs = SECRET_AGE_WARN_DAYS * 24 * 60 * 60 * 1000
      let hasOld = false

      console.log(`\n${'LABEL'.padEnd(24)} ${'ENV'.padEnd(16)} ${'VER'.padEnd(6)} ${'AGE'.padEnd(10)} ${'CREATED'.padEnd(24)} ID`)
      console.log('-'.repeat(110))
      for (const b of blobs) {
        const createdMs  = new Date(b.createdAt).getTime()
        const ageDays    = Math.floor((now - createdMs) / (1000 * 60 * 60 * 24))
        const ageLabel   = ageDays < 1 ? 'today' : `${ageDays}d`
        const ageDisplay = ageDays >= SECRET_AGE_WARN_DAYS ? `⚠ ${ageLabel}` : ageLabel
        const created    = new Date(b.createdAt).toLocaleString()
        if (ageDays >= SECRET_AGE_WARN_DAYS) hasOld = true
        console.log(
          `${b.label.padEnd(24)} ${b.environment.padEnd(16)} ${String(b.version).padEnd(6)} ${ageDisplay.padEnd(10)} ${created.padEnd(24)} ${b.id}`
        )
      }
      console.log()
      if (hasOld) console.log(`  ⚠ Secrets marked with ⚠ are older than ${SECRET_AGE_WARN_DAYS} days — consider rotating them.\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })

secretsCmd
  .command('pull')
  .description('Decrypt a secret blob and write it to a .env file locally')
  .requiredOption('--id <blobId>',    'Blob ID (from vaultsync secrets list)')
  .option('--out <path>',             'Output file path (default: .env.pulled)')
  .option('--yes',                    'Overwrite output file without prompting')
  .action(async (opts) => {
    try {
      const outPath = opts.out ?? '.env.pulled'

      if (!opts.yes && existsSync(outPath)) {
        const ok = await confirm(`"${outPath}" already exists — overwrite?`)
        if (!ok) { console.log('Aborted.'); return }
      }

      // Fetch ciphertext from server
      const result = await api('GET', `/secrets/${opts.id}/download`) as {
        label: string; environment: string; version: number
        ciphertext: string; iv: string; auth_tag: string
      }

      // Load local AES key
      const key = loadKey(result.label, result.environment)

      // Decrypt
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(result.iv, 'base64')
      )
      decipher.setAuthTag(Buffer.from(result.auth_tag, 'base64'))
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(result.ciphertext, 'base64')),
        decipher.final(),
      ])

      writeFileSync(outPath, plaintext, { mode: 0o600 })
      console.log(`\n✓ Decrypted "${result.label}" (${result.environment}) v${result.version} → ${outPath}`)
      console.log(`  ⚠ This file contains plaintext secrets — do not commit it.\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })


secretsCmd
  .command('diff')
  .description('Compare two versions of a secret blob locally')
  .option('--label <label>',     'Secret label')
  .option('--env <environment>', 'Environment')
  .action(async (opts) => {
    try {
      const proj  = loadProjectConfig()
      const label = opts.label ?? proj.label
      const env   = opts.env   ?? proj.env

      if (!label || !env) {
        console.error('✗ --label and --env are required (or set them in .vaultsync.yml)')
        process.exit(1)
      }

      const result = await api('GET', '/secrets', undefined, { label, environment: env }) as {
        blobs: Array<{ id: string; version: number; createdAt: string }>
      }

      if (result.blobs.length < 2) {
        console.log('Only one version exists — nothing to diff.')
        return
      }

      // Sort descending by version, take last two
      const sorted = result.blobs.sort((a, b) => b.version - a.version)
      const [latest, previous] = sorted

      const [latestBlob, prevBlob] = await Promise.all([
        api('GET', `/secrets/${latest.id}/download`),
        api('GET', `/secrets/${previous.id}/download`),
      ]) as Array<{ label: string; environment: string; version: number; ciphertext: string; iv: string; auth_tag: string }>

      const key = loadKey(label, env)

      function decrypt(blob: typeof latestBlob): string {
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'))
        decipher.setAuthTag(Buffer.from(blob.auth_tag, 'base64'))
        return Buffer.concat([decipher.update(Buffer.from(blob.ciphertext, 'base64')), decipher.final()]).toString('utf8')
      }

      const prevLines   = new Set(decrypt(prevBlob).split('\n').map(l => l.trim()).filter(Boolean))
      const latestLines = decrypt(latestBlob).split('\n').map(l => l.trim()).filter(Boolean)

      console.log(`\nDiff: "${label}" (${env})  v${previous.version} → v${latest.version}`)
      console.log(`  Previous: ${new Date(previous.createdAt).toLocaleString()}`)
      console.log(`  Latest:   ${new Date(latest.createdAt).toLocaleString()}\n`)

      let changed = false
      for (const line of latestLines) {
        if (!prevLines.has(line)) {
          const key = line.split('=')[0]
          console.log(`  + ${key}=<changed>`)
          changed = true
        }
      }
      const latestSet = new Set(latestLines.map(l => l.split('=')[0]))
      for (const line of prevLines) {
        const k = line.split('=')[0]
        if (!latestSet.has(k)) {
          console.log(`  - ${k}`)
          changed = true
        }
      }
      if (!changed) console.log('  No changes detected between versions.')
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
  .option('--yes', 'Skip confirmation prompt')
  .action(async (opts) => {
    try {
      if (!opts.yes) {
        const ok = await confirm(`Delete secret ${opts.id}? This removes all machine access grants for this blob.`)
        if (!ok) { console.log('Aborted.'); return }
      }
      const result = await api('DELETE', `/secrets/${opts.id}`)
      console.log(`✓ ${result.message}`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })
