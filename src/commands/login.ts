import { Command } from 'commander'
import { saveConfig } from '../config.js'

export const loginCmd = new Command('login')
  .description('Authenticate with VaultSync')
  .requiredOption('--key <apiKey>', 'Your VaultSync API key (starts with vs_)')
  .action(async (opts) => {
    if (!opts.key.startsWith('vs_') && !opts.key.startsWith('vps_ad')) {
      console.error('✗ Invalid API key format — user keys start with vs_, admin keys start with vps_ad')
      process.exit(1)
    }
    saveConfig(opts.key)
    console.log('✓ Logged in successfully')
    console.log('  Credentials saved to ~/.vaultsync/config.json')
  })
