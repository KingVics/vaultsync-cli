#!/usr/bin/env node
import { program } from 'commander';
import { createRequire } from 'module';
import { loginCmd } from './commands/login.js';
import { machinesCmd } from './commands/machines.js';
import { secretsCmd } from './commands/secrets.js';
import { policyCmd } from './commands/policy.js';
import { auditCmd } from './commands/audit.js';
// Read version from package.json — single source of truth
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
program
    .name('vaultsync')
    .description('Zero-disk secrets delivery for your VPS')
    .version(version);
program.addCommand(loginCmd);
program.addCommand(machinesCmd);
program.addCommand(secretsCmd);
program.addCommand(policyCmd);
program.addCommand(auditCmd);
program.parse();
