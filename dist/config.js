import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
const CONFIG_DIR = join(homedir(), '.vaultsync');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export function loadConfig() {
    if (!existsSync(CONFIG_FILE)) {
        throw new Error('Not logged in. Run: vaultsync login --server <url> --key <apiKey>');
    }
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    return { ...config, serverUrl: config.serverUrl.replace(/\/+$/, '') };
}
export function saveConfig(config) {
    if (!existsSync(CONFIG_DIR))
        mkdirSync(CONFIG_DIR, { recursive: true });
    // chmod 600 — only owner can read
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}
