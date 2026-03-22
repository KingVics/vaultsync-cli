import { Command } from 'commander'
import { publicEncrypt, constants } from 'crypto'
import { loadConfig } from '../config.js'
import { loadKey } from './secrets.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Envelope encryption: wrap the AES key with the machine's RSA public key.
 * The wrapped key is safe to store on the server — only the machine with the
 * matching private key can unwrap it.
 */
function wrapKey(aesKey: Buffer, machinePublicKeyPem: string): Buffer {
  return publicEncrypt(
    { key: machinePublicKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  )
}

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

// ── Command ───────────────────────────────────────────────────────────────────

export const policyCmd = new Command('grant')
  .description('Grant a machine access to a secret blob')
  .requiredOption('--machine <n>',       'Machine name (e.g. production-01)')
  .requiredOption('--label <label>',     'Secret label (e.g. API-Backend)')
  .requiredOption('--env <environment>', 'Environment (e.g. Production)')
  .action(async (opts) => {
    try {
      // 1. Fetch machine record to get its public key
      const machinesResult = await api('GET', '/machines')
      const machineList = machinesResult.machines as Array<{
        id: string; name: string; status: string; publicKey?: string
      }>
      const machine = machineList.find(m => m.name === opts.machine)

      if (!machine) {
        throw new Error(
          `Machine "${opts.machine}" not found.\n` +
          `  Run \`vaultsync machine list\` to see enrolled machines.`
        )
      }
      if (machine.status === 'revoked') {
        throw new Error(`Machine "${opts.machine}" is revoked and cannot be granted access.`)
      }
      if (!machine.publicKey) {
        throw new Error(`Machine "${opts.machine}" has no public key on record. Re-enroll the machine.`)
      }

      // 2. Load the locally-stored AES key for this label+environment
      const aesKey = loadKey(opts.label, opts.env)

      // 3. Wrap the AES key with the machine's RSA public key
      const wrappedKey = wrapKey(aesKey, machine.publicKey)
      console.log(`✓ AES key wrapped with ${opts.machine}'s RSA public key`)

      // 4. POST /policy — server stores the access grant + wrapped key
      const result = await api('POST', '/policy', {
        machine_name: opts.machine,
        label:        opts.label,
        environment:  opts.env,
        wrapped_key:  wrappedKey.toString('base64'),
      })

      console.log(`\n${result.message}`)
      console.log(`  Machine ID:  ${result.machine_id}`)
      console.log(`  Blob ID:     ${result.blob_id}`)
      console.log(`  Version:     v${result.version}`)
      console.log(`\n  The machine can now run:`)
      console.log(`  VAULTSYNC_SERVER=<url> vaultsync run --label ${opts.label} --env ${opts.env} -- <command>\n`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  })
