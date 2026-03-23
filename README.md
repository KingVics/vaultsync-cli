# VaultSync CLI — Zero-Disk Secrets Management for VPS & Node.js

> Run apps with secrets — without ever storing `.env` files on your server.
> Think: **dotenv + Vault + SSH identity — without the complexity.**

VaultSync CLI lets you securely deliver secrets to your applications by encrypting them locally and injecting them into processes at runtime. **Plaintext never leaves your machine and is never written to disk on the server.**

---

## ⚡ Quick demo

```bash
vaultsync secrets push --file .env
vaultsync run --label API --env prod -- node app.js
```

No `.env` files on your server. No secrets on disk.

---

## 🧠 How it works

```
Developer machine                  VaultSync Server              VPS Agent
─────────────────                  ────────────────              ─────────
vaultsync secrets push   ───────►  stores AES ciphertext
vaultsync grant          ───────►  stores RSA-wrapped AES key
                                        │
                                        ▼
                                   vaultsync run ──► decrypts in RAM ──► injects into process env
```

1. CLI encrypts your `.env` file locally with AES-256-GCM
2. Only ciphertext is sent to the server — plaintext is never exposed
3. AES key is wrapped with each machine's RSA public key
4. Secrets are decrypted **only in memory on the VPS**
5. Secrets are zeroed after process exit

---

## 🖥️ Two separate tools

VaultSync uses two binaries:

🖥️ **Local machine (your laptop/dev box)**
- `vaultsync-cli` → push secrets, manage machines, admin

🖧 **VPS (your server)**
- `vaultsync agent` → fetch secrets and inject at runtime

> The CLI is for your **local machine**. The agent is what runs on your VPS. Do not install the CLI on your VPS.

---

## 📦 Installation

Install the CLI on your **local machine**:

```bash
npm install -g vaultsync-cli
```

Requires **Node.js 18+**

---

## 🏁 Quick start

> 🖥️ = local machine &nbsp;&nbsp; 🖧 = VPS

---

### 1. Set server URL — 🖥️

```bash
export VAULTSYNC_SERVER=https://your-vault-server.com
```

Add to your shell profile (`~/.bashrc`, `~/.zshrc`) so it persists.

---

### 2. Run setup wizard — 🖥️

```bash
vaultsync init
```

Prompts for your server URL and API key, tests the connection, and optionally creates a `.vaultsync.yml` project config.

---

### 3. Register account — 🖥️

Ask your server owner for an invite code (if the server requires one):

```bash
# Private server (invite required)
vaultsync register --invite inv_<code> --name yourname

# Open server (no invite needed)
vaultsync register --name yourname
```

Your account is created and you are **automatically logged in**. Save the API key — it is only shown once.

> **Lost your key?** Ask the server owner to run `vaultsync admin user reset-key --id <your-id>` — a new key is issued and the old one revoked immediately.

---

### 4. Push secrets — 🖥️

```bash
vaultsync secrets push --label API-Backend --env Production --file .env
```

Or with a `.vaultsync.yml` project config (see below):

```bash
vaultsync secrets push --file .env
```

---

### 5. Create machine — 🖥️

```bash
vaultsync machine create --name production-01
```

Returns a one-time enrollment token (OTET) that expires in 15 minutes.

---

### 6. Enroll VPS — 🖧

```bash
# Install the agent (run once)
curl -fsSL https://cdn.jsdelivr.net/gh/KingVics/vaultsync-releases@main/install.sh | sudo bash

# Enroll with the token from step 5
sudo vaultsync enroll <OTET>
```

> `sudo` is required — the agent stores its identity key in `/etc/vaultsync/`.

---

### 7. Grant access — 🖥️

```bash
vaultsync grant --machine production-01 --label API-Backend --env Production
```

> Re-run after every `secrets push` to restore machine access to the new version.

---

### 8. Run app — 🖧

```bash
sudo vaultsync run --label API-Backend --env Production -- node dist/index.js
```

Secrets are injected into environment variables and never written to disk.

---

## 🗂️ Project config (`.vaultsync.yml`)

Add a `.vaultsync.yml` in your project root to set default `label` and `env`:

```yaml
# .vaultsync.yml
label: "API-Backend"
env: "Production"
```

Commands that use project config: `secrets push`, `secrets pull`, `secrets diff`.

> Add `.vaultsync.yml` to `.gitignore` if the label/env names are sensitive.

---

## 📚 Commands

### Setup

```bash
vaultsync init                    # interactive setup wizard
vaultsync verify                  # check server connection + auth
vaultsync doctor                  # diagnose common issues
vaultsync completion bash         # print bash completion script
vaultsync completion zsh          # print zsh completion script
```

Enable shell completion:

```bash
# bash
echo 'source <(vaultsync completion bash)' >> ~/.bashrc

# zsh
echo 'source <(vaultsync completion zsh)' >> ~/.zshrc
```

---

### Account

```bash
vaultsync register --name <username> [--invite <code>]
vaultsync login --key <apiKey>
```

---

### Secrets

```bash
# Push (encrypts locally before upload)
vaultsync secrets push --label <l> --env <e> --file .env

# List (shows ⚠ warning for secrets older than 90 days)
vaultsync secrets list

# Download and decrypt a secret to a local file
vaultsync secrets pull --id <blobId> [--out .env.local]

# Show what changed between the last two versions
vaultsync secrets diff --label <l> --env <e>

# Delete
vaultsync secrets delete --id <blobId>
```

---

### Machines

```bash
vaultsync machine create --name <name>   # create + one-time enrollment token
vaultsync machine list                   # list machines and status
vaultsync machine revoke --id <id>       # block access without deleting
vaultsync machine delete --id <id>       # permanently remove
```

---

### Access control

```bash
vaultsync grant --machine <name> --label <label> --env <environment>
```

> Re-run after every `secrets push`.

---

### Audit

```bash
vaultsync audit
vaultsync audit --action SECRET_FETCHED
vaultsync audit --limit 100
```

---

### Admin (server owner only)

Requires the master API key (`vps_ad...`).

```bash
# User management
vaultsync admin user create --name <name>
vaultsync admin user list
vaultsync admin user deactivate --id <id>
vaultsync admin user activate --id <id>
vaultsync admin user reset-key --id <id>         # issue new key, revoke old
vaultsync admin user delete --id <id> [--yes]

# Invite codes
vaultsync admin invite create [--expires-hours 24]
vaultsync admin invite list
vaultsync admin invite delete --id <id>
```

---

## 🐳 Docker & CI/CD

**Docker:**

```dockerfile
CMD ["vaultsync", "run", "--label", "API", "--env", "Production", "--", "node", "dist/index.js"]
```

**GitHub Actions:**

```yaml
- name: Run tests with secrets
  run: vaultsync run --label API --env CI -- npm test
  env:
    VAULTSYNC_SERVER: ${{ secrets.VAULT_SERVER }}
```

---

## 🔐 Security model

- AES-256-GCM encryption for secret blobs
- RSA-4096 (OAEP SHA-256) for key wrapping
- Challenge-response authentication (no passwords)
- Replay protection using Redis (single-use nonce)
- Account lockout after repeated failed auth attempts
- **Zero-disk (runtime)**: secrets decrypted only in memory on the VPS
- Per-machine access control
- Full audit log for every access

---

## 🛡️ Why VaultSync?

- Secrets encrypted **before leaving your machine**
- Server stores only ciphertext — never plaintext
- Runtime injection — no `.env` files on servers
- Per-machine access using RSA keypairs
- Secrets wiped from memory after execution
- Lightweight — no heavy infrastructure required

---

## 🆚 Alternatives

VaultSync is a lightweight self-hosted alternative to HashiCorp Vault, Doppler, and Infisical — with no SaaS subscriptions and no plaintext secrets stored anywhere.

---

## 🔍 Keywords

secrets management, dotenv alternative, environment variables, nodejs secrets, vps deployment, encryption cli, zero trust security, self-hosted vault, aes-256, rsa-4096

---

## 📄 License

MIT
