import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

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
  return { apiKey: raw.apiKey, serverUrl: SERVER_URL }
}

export function saveConfig(apiKey: string): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey }, null, 2), { mode: 0o600 })
}
