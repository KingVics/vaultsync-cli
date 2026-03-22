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

## 📦 Installation

```bash
npm install -g vaultsync-cli
```

Requires **Node.js 18+**

---

## 🏁 Quick start

### 1. Get an invite code

Ask your server owner for an invite code, then register your account:

```bash
VAULTSYNC_SERVER=https://your-vault-server.com vaultsync register --invite inv_xxx --name alice
```

This returns a one-time API key — save it immediately.

---

### 2. Log in

```bash
vaultsync login --key <YOUR_API_KEY>
```

Credentials are saved to `~/.vaultsync/config.json` (mode 600).

Set the server URL once via environment variable (or add it to your shell profile):

```bash
export VAULTSYNC_SERVER=https://your-vault-server.com
```

---

### 3. Push a secret

```bash
vaultsync secrets push --label API-Backend --env Production --file .env
```

The AES key is stored locally and never sent to the server.

---

### 4. Create a machine

```bash
vaultsync machine create --name production-01
```

Returns a one-time enrollment token (OTET).

---

### 5. Enroll the VPS

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/KingVics/vaultsync-releases@main/install.sh | sudo bash
vaultsync enroll <OTET>
```

---

### 6. Grant access

```bash
vaultsync grant --machine production-01 --label API-Backend --env Production
```

---

### 7. Run your app

```bash
vaultsync run --label API-Backend --env Production -- node dist/index.js
```

Secrets are injected into environment variables and never written to disk.

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
