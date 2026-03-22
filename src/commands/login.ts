import { Command } from 'commander'
import { saveConfig } from '../config.js'

export const loginCmd = new Command('login')
  .description('Authenticate with VaultSync')
  .requiredOption('--key <apiKey>', 'Your VaultSync API key (starts with vs_)')
  .action(async (opts) => {
    if (!opts.key.startsWith('vs_')) {
      console.error('✗ Invalid API key format — keys must start with vs_')
      process.exit(1)
    }
    saveConfig(opts.key)
    console.log('✓ Logged in successfully')
    console.log('  Credentials saved to ~/.vaultsync/config.json')
  })
