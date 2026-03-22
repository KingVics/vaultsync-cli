import { Command } from 'commander'
import { saveConfig, SERVER_URL } from '../config.js'

export const loginCmd = new Command('login')
  .description('Authenticate with VaultSync')
  .requiredOption('--key <apiKey>', 'Your VaultSync API key')
  .action(async (opts) => {
    saveConfig(opts.key)
    console.log(`✓ Logged in to ${SERVER_URL}`)
    console.log('  Credentials saved to ~/.vaultsync/config.json')
  })
