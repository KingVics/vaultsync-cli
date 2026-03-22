# VaultSync CLI — Zero-Disk Secrets Management for VPS & Node.js

> Run apps with secrets — without ever storing `.env` files on your server.  
> Think: **dotenv + Vault + SSH identity — without the complexity.**

VaultSync CLI lets you securely deliver secrets to your applications by encrypting them locally and injecting them into processes at runtime. **Plaintext never leaves your machine and is never written to disk on the server.**

---

## ⚡ Quick demo

```bash
vaultsync secrets push --label API --env prod --file .env
vaultsync run --label API --env prod -- node app.js
```

No `.env` files on your server. No secrets on disk.

---

## ❌ Why not `.env` files?

- copied across servers  
- stored in plaintext  
- easy to leak or forget  
- hard to rotate  

VaultSync avoids all of this.

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

> The CLI is for your local machine. The agent is what runs on your VPS.

---

## 📦 Installation

Install the CLI on your **local machine**:

```bash
npm install -g vaultsync-cli
```

Requires **Node.js 18+**

---

## 🏁 Quick start

> 🖥️ = local machine  
> 🖧 = VPS  

---

### 1. Set server URL — 🖥️

```bash
export VAULTSYNC_SERVER=https://your-vault-server.com
```

---

### 2. Register account — 🖥️

Ask your server owner for an invite code (if the server requires one), then register:

```bash
# Private server (invite required)
vaultsync register --invite inv_<code> --name yourname

# Open server (no invite needed)
vaultsync register --name yourname
```

Your account is created and you are **automatically logged in** — no need to run `login` separately. Save the API key shown — it is only displayed once.

---

### 3. Log in — 🖥️

Only needed if you already have an API key and want to log in on a new machine:

```bash
vaultsync login --key <YOUR_API_KEY>
```

> **Lost your key?** Ask the server owner to run `vaultsync admin user reset-key --id <your-id>` — a new key will be issued and the old one revoked immediately.

---

### 4. Push secrets — 🖥️

```bash
vaultsync secrets push --label API-Backend --env Production --file .env
```

---

### 5. Create machine — 🖥️

```bash
vaultsync machine create --name production-01
```

---

### 6. Enroll VPS — 🖧

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/KingVics/vaultsync-releases@main/install.sh | sudo bash
sudo vaultsync enroll <OTET>
```

---

### 7. Grant access — 🖥️

```bash
vaultsync grant --machine production-01 --label API-Backend --env Production
```

---

### 8. Run app — 🖧

```bash
sudo vaultsync run --label API-Backend --env Production -- node dist/index.js
```

Secrets are injected into environment variables and never written to disk.

---

## 🛡️ Why VaultSync?

- 🔐 Secrets encrypted **before leaving your machine**  
- 🧠 Server stores only ciphertext — never plaintext  
- ⚡ Runtime injection (no `.env` files on servers)  
- 🔑 Per-machine access using RSA keypairs  
- 🧹 Secrets wiped from memory after execution  

---

## 🆚 Alternatives

VaultSync is a lightweight alternative to:

- HashiCorp Vault  
- Doppler  
- Infisical  

Unlike traditional tools, VaultSync:

- requires no heavy infrastructure  
- avoids storing plaintext secrets anywhere  
- injects secrets directly into process memory  

---

## 📚 Commands

### Account

```bash
# Register (--invite only needed if server requires it)
vaultsync register --name <username> [--invite <code>]

# Log in with an existing API key
vaultsync login --key <apiKey>
```

---

### Secrets

- `secrets push --label <l> --env <e> --file .env` → encrypt + upload
- `secrets list` → view stored blobs
- `secrets delete --id <id>` → remove a blob

---

### Machines

- `machine create --name <name>` → create slot + one-time enrollment token
- `machine list` → list machines and their status
- `machine revoke --id <id>` → block access without deleting
- `machine delete --id <id>` → permanently remove

---

### Access control

```bash
vaultsync grant --machine <name> --label <label> --env <environment>
```

> Re-run after every `secrets push` to restore machine access to the new version.

---

### Audit

```bash
vaultsync audit
```

---

### Admin (server owner only)

Requires the master API key set via `VAULTSYNC_SERVER` + `x-api-key`.

```bash
# User management
vaultsync admin user create --name <name>       # create user, show API key once
vaultsync admin user list                        # list all users
vaultsync admin user deactivate --id <id>        # block without deleting
vaultsync admin user activate --id <id>          # re-enable
vaultsync admin user reset-key --id <id>         # issue new key, revoke old one
vaultsync admin user delete --id <id> [--yes]    # delete user + all their data

# Invite codes
vaultsync admin invite create [--expires-hours 24]   # generate one-time invite
vaultsync admin invite list                           # list active invites
vaultsync admin invite delete --id <id>              # revoke unused invite
```

---

## 🔐 Security model

- AES-256-GCM encryption for secret blobs  
- RSA-4096 (OAEP SHA-256) for key wrapping  
- Challenge-response authentication  
- Replay protection using Redis  
- **Zero-disk (runtime)**: secrets decrypted only in memory on the VPS  
- Per-machine access control  

---

## 🔍 Keywords

secrets management, dotenv alternative, environment variables, nodejs secrets, vps deployment, encryption cli, zero trust security

---

## 📄 License

MIT
