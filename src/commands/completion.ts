import { Command } from 'commander'

const BASH_COMPLETION = `
# VaultSync bash completion
# Add to ~/.bashrc:  source <(vaultsync completion bash)

_vaultsync_completion() {
  local cur prev words
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  local commands="init login register verify doctor audit secrets machine grant admin completion"
  local secrets_cmds="push pull list delete diff"
  local machine_cmds="create list revoke delete"
  local admin_cmds="user invite"
  local admin_user_cmds="create list deactivate activate reset-key delete"
  local admin_invite_cmds="create list delete"

  case "\${COMP_WORDS[1]}" in
    secrets)
      COMPREPLY=( \$(compgen -W "\$secrets_cmds" -- "\$cur") )
      return ;;
    machine)
      COMPREPLY=( \$(compgen -W "\$machine_cmds" -- "\$cur") )
      return ;;
    admin)
      case "\${COMP_WORDS[2]}" in
        user)   COMPREPLY=( \$(compgen -W "\$admin_user_cmds"   -- "\$cur") ); return ;;
        invite) COMPREPLY=( \$(compgen -W "\$admin_invite_cmds" -- "\$cur") ); return ;;
        *)      COMPREPLY=( \$(compgen -W "\$admin_cmds"        -- "\$cur") ); return ;;
      esac ;;
    *)
      COMPREPLY=( \$(compgen -W "\$commands" -- "\$cur") )
      return ;;
  esac
}

complete -F _vaultsync_completion vaultsync
`.trim()

const ZSH_COMPLETION = `
# VaultSync zsh completion
# Add to ~/.zshrc:  source <(vaultsync completion zsh)

_vaultsync() {
  local -a commands
  commands=(
    'init:Interactive setup wizard'
    'login:Save your API key'
    'register:Create a new account'
    'verify:Check server connection and auth'
    'doctor:Diagnose common setup issues'
    'audit:View audit log'
    'secrets:Manage secret blobs'
    'machine:Manage machines'
    'grant:Grant machine access to a secret'
    'admin:Server administration'
    'completion:Print shell completion script'
  )
  _describe 'command' commands
}

compdef _vaultsync vaultsync
`.trim()

export const completionCmd = new Command('completion')
  .description('Print shell completion script')
  .argument('<shell>', 'Shell type: bash or zsh')
  .action((shell: string) => {
    if (shell === 'bash') {
      console.log(BASH_COMPLETION)
    } else if (shell === 'zsh') {
      console.log(ZSH_COMPLETION)
    } else {
      console.error(`✗ Unknown shell "${shell}" — supported: bash, zsh`)
      console.error('  Usage: source <(vaultsync completion bash)')
      process.exit(1)
    }
  })
