#!/usr/bin/env node
import { program } from 'commander'
import { createRequire } from 'module'
import { loginCmd }      from './commands/login.js'
import { machinesCmd }   from './commands/machines.js'
import { secretsCmd }    from './commands/secrets.js'
import { policyCmd }     from './commands/policy.js'
import { auditCmd }      from './commands/audit.js'
import { adminCmd }      from './commands/admin.js'
import { registerCmd }   from './commands/register.js'
import { initCmd }       from './commands/init.js'
import { doctorCmd }     from './commands/doctor.js'
import { verifyCmd }     from './commands/verify.js'
import { completionCmd } from './commands/completion.js'

// Read version from package.json — single source of truth
const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

program
  .name('vaultsync')
  .description('Zero-disk secrets delivery for your VPS')
  .version(version)

program.addCommand(initCmd)
program.addCommand(loginCmd)
program.addCommand(registerCmd)
program.addCommand(verifyCmd)
program.addCommand(doctorCmd)
program.addCommand(secretsCmd)
program.addCommand(machinesCmd)
program.addCommand(policyCmd)
program.addCommand(auditCmd)
program.addCommand(adminCmd)
program.addCommand(completionCmd)

program.parse()
