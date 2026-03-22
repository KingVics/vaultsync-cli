import { Command } from 'commander'
import { saveConfig } from '../config.js'

export const loginCmd = new Command('login')
  .description('Authenticate with VaultSync')
  .requiredOption('--key <apiKey>', 'Your VaultSync API key')
  .action(async (opts) => {
    saveConfig(opts.key)
    console.log('✓ Logged in successfully')
    console.log('  Credentials saved to ~/.vaultsync/config.json')
  })
