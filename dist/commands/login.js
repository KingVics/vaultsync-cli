import { Command } from 'commander';
import { saveConfig } from '../config.js';
export const loginCmd = new Command('login')
    .description('Authenticate with your VaultSync server')
    .requiredOption('--server <url>', 'VaultSync server URL (e.g. https://vault.example.com)')
    .requiredOption('--key <apiKey>', 'Developer API key')
    .action(async (opts) => {
    saveConfig({ serverUrl: opts.server, apiKey: opts.key });
    console.log('✓ Credentials saved to ~/.vaultsync/config.json');
});
