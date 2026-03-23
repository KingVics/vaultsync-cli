import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

// ── Project config (.vaultsync.yml in current directory) ──────────────────────

export interface ProjectConfig {
  label?: string
  env?:   string
}

export function loadProjectConfig(): ProjectConfig {
  const path = join(process.cwd(), '.vaultsync.yml')
  if (!existsSync(path)) return {}
  const config: ProjectConfig = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colon = trimmed.indexOf(':')
    if (colon === -1) continue
    const key = trimmed.slice(0, colon).trim()
    const val = trimmed.slice(colon + 1).trim().replace(/^["']|["']$/g, '')
    if (key === 'label') config.label = val
    if (key === 'env')   config.env   = val
  }
  return config
}

// Server URL — override with VAULTSYNC_SERVER env var for self-hosted deployments
export const SERVER_URL = (process.env.VAULTSYNC_SERVER ?? 'https://vault.allspheresynergy.com').replace(/\/+$/, '')

const CONFIG_DIR  = join(homedir(), '.vaultsync')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export interface VaultConfig {
  apiKey:    string
  serverUrl: string
}

export function loadConfig(): VaultConfig {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error('Not logged in. Run: vaultsync login --key <apiKey>')
  }
  const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as { apiKey: string }
  if (!raw.apiKey || (!raw.apiKey.startsWith('vs_') && !raw.apiKey.startsWith('vps_ad'))) {
    throw new Error('Stored API key is invalid — run: vaultsync login --key <apiKey>')
  }
  return { apiKey: raw.apiKey, serverUrl: SERVER_URL }
}

export function saveConfig(apiKey: string): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey }, null, 2), { mode: 0o600 })
}
