# VaultSync CLI — Zero-Disk Secrets Management for VPS & Node.js

> Run apps with secrets — without ever storing `.env` files on your server.

VaultSync CLI lets you securely deliver secrets to your applications by encrypting them locally and injecting them into processes at runtime. **Plaintext never leaves your machine and is never written to disk on the server.**

---

## ⚡ Quick demo

```bash
vaultsync secrets push --label API --env prod --file .env
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

VaultSync has two binaries — make sure you're using the right one:

| Tool | Installed on | Purpose |
|------|-------------|---------|
| **vaultsync-cli** (this package) | Your **developer/local machine** | Push secrets, manage machines, register, admin |
| **vaultsync agent** | Your **VPS** | Fetch secrets at runtime and inject into processes |

> **Never install the CLI on your VPS.** The agent (`curl ... | sudo bash`) is what runs there.

---

## 📦 Installation

Install the CLI on your **local machine**:

```bash
npm install -g vaultsync-cli
```

Requires **Node.js 18+**

---

## 🏁 Quick start

> Commands marked **[local]** run on your developer machine. Commands marked **[VPS]** run on your server.

---

### 1. Set the server URL — [local]

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) once:

```bash
export VAULTSYNC_SERVER=https://your-vault-server.com
```

---

### 2. Register your account — [local]

Ask your server owner for an invite code, then create your account:

```bash
vaultsync register --invite inv_<code> --name yourname
```

This returns a one-time API key — **save it immediately**, it won't be shown again.

---

### 3. Log in — [local]

```bash
vaultsync login --key <YOUR_API_KEY>
```

Your credentials are saved to `~/.vaultsync/config.json`.

---

### 4. Push a secret — [local]

```bash
vaultsync secrets push --label API-Backend --env Production --file .env
```

Your `.env` is encrypted locally — only ciphertext is sent to the server.

---

### 5. Create a machine — [local]

```bash
vaultsync machine create --name production-01
```

Copy the one-time enrollment token (OTET) from the output.

---

### 6. Enroll the VPS — [VPS]

> **Use `sudo`** — the agent writes its identity key to `/etc/vaultsync/` which requires root.

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/KingVics/vaultsync-releases@main/install.sh | sudo bash
sudo vaultsync enroll <OTET>
```

---

### 7. Grant access — [local]

```bash
vaultsync grant --machine production-01 --label API-Backend --env Production
```

---

### 8. Run your app — [VPS]

```bash
sudo vaultsync run --label API-Backend --env Production -- node dist/index.js
```

Secrets are injected into your app's environment variables and never written to disk.

---

## 🛡️ Why VaultSync?

* 🔐 Secrets encrypted **before leaving your machine**
* 🧠 Server stores only ciphertext — never plaintext
* ⚡ Runtime injection (no `.env` files on servers)
* 🔑 Per-machine access using RSA keypairs
* 🧹 Secrets wiped from memory after execution

---

## 🆚 Alternatives

VaultSync is a lightweight alternative to:

* HashiCorp Vault
* Doppler
* Infisical

Unlike traditional tools, VaultSync:

* requires no heavy infrastructure
* avoids storing plaintext secrets anywhere
* injects secrets directly into process memory

---

## 📚 Commands

### Account

```bash
# Register with an invite code (no login required)
vaultsync register --invite <code> --name <username>

# Save your API key locally
vaultsync login --key <apiKey>
```

---

### Secrets

* `secrets push` → encrypt + upload `.env`
* `secrets list` → view stored blobs
* `secrets delete` → remove secrets

---

### Machines

* `machine create` → create + enrollment token
* `machine list` → list machines
* `machine revoke` → block access
* `machine delete` → remove machine

---

### Access control

```bash
vaultsync grant --machine <name> --label <label> --env <environment>
```

> Re-run `grant` after each `secrets push`

---

### Audit

```bash
vaultsync audit
```

---

### Admin (server owner only)

Requires your master API key.

```bash
# User management
vaultsync admin user create --name <name>
vaultsync admin user list
vaultsync admin user deactivate --id <id>
vaultsync admin user activate --id <id>
vaultsync admin user delete --id <id>

# Invite codes
vaultsync admin invite create [--expires-hours 24]
vaultsync admin invite list
vaultsync admin invite delete --id <id>
```

---

## 🔐 Security model

* AES-256-GCM encryption for secret blobs
* RSA-4096 (OAEP SHA-256) for key wrapping
* Challenge-response authentication (no passwords)
* Replay protection using Redis (short-lived nonce)
* **Zero-disk (runtime)**: secrets decrypted only in memory on the VPS
* Per-machine access control

---

## 🔍 Keywords

secrets management, dotenv alternative, environment variables, nodejs secrets, vps deployment, encryption cli, zero trust security

---

## 📄 License

MIT
