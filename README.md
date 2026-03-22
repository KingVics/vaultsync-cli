# vaultsync-cli

Zero-disk secrets delivery for your VPS — push encrypted secrets from your machine and inject them into any process at runtime. **Plaintext never leaves your developer machine and never touches disk on the server.**

## How it works

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
2. Ciphertext is pushed to the server — the server **never sees plaintext**
3. The AES key is wrapped with each machine's RSA public key and stored per-machine
4. At runtime, the agent decrypts the key in RAM and injects secrets into the child process environment
5. Secrets are zeroed from memory after the process exits

## Installation

```bash
npm install -g vaultsync-cli
```

Requires **Node.js 18+**.

## Quick start

### 1. Start your VaultSync server

Deploy the [vaultsync server](https://github.com/KingVics/vaultsync/tree/main/server) and note your server URL and master API key.

### 2. Log in from your developer machine

```bash
vaultsync login --key <YOUR_API_KEY>
```

Credentials are saved to `~/.vaultsync/config.json` (mode 600).

### 3. Push a secret

```bash
vaultsync secrets push --label API-Backend --env Production --file .env
```

The AES key is saved to `~/.vaultsync/keys/` and never sent to the server.

### 4. Create a machine slot

```bash
vaultsync machine create --name production-01
# Returns a one-time enrollment token (OTET) — valid for 15 minutes
```

### 5. Enroll the VPS

On your VPS, install the agent:

```bash
curl -fsSL https://github.com/KingVics/vaultsync/releases/latest/download/install.sh | sudo bash
```

Then enroll it using the token from step 4:

```bash
vaultsync enroll <OTET>
```

### 6. Grant the machine access

Back on your developer machine:

```bash
vaultsync grant --machine production-01 --label API-Backend --env Production
```

### 7. Run your app with secrets injected

On the VPS:

```bash
vaultsync run --label API-Backend --env Production -- node dist/index.js
```

Secrets are available as environment variables inside the process. They are never written to disk.

---

## Commands

### `vaultsync login`

```
vaultsync login --key <apiKey>
```

Save your API key to `~/.vaultsync/config.json`.

For self-hosted deployments, set `VAULTSYNC_SERVER` before logging in:
```bash
VAULTSYNC_SERVER=https://your-vault-server.com vaultsync login --key <apiKey>
```

---

### `vaultsync secrets`

| Command | Description |
|---|---|
| `secrets push --label <l> --env <e> --file <path>` | Encrypt and push a `.env` file |
| `secrets list [--label <l>] [--env <e>]` | List all secret blobs |
| `secrets delete --id <blobId>` | Delete a blob and all its access grants |

---

### `vaultsync machine`

| Command | Description |
|---|---|
| `machine create --name <n>` | Create a machine slot and get its enrollment token |
| `machine list` | List all enrolled machines |
| `machine revoke --id <id>` | Revoke a machine (blocks all future secret fetches) |
| `machine delete --id <id>` | Permanently delete a machine |

---

### `vaultsync grant`

```
vaultsync grant --machine <name> --label <label> --env <environment>
```

Wrap the local AES key with the machine's RSA public key and register the access policy on the server.

> Re-run `grant` after every `secrets push` — each push creates a new blob with a new ID.

---

### `vaultsync audit`

```
vaultsync audit [--machine-id <uuid>] [--action <ACTION>] [--limit <n>]
```

View the server-side audit log. Filter by machine or action type (e.g. `SECRET_FETCHED`, `CHALLENGE_FAILED`).

---

## Security model

- **AES-256-GCM** encryption for secret blobs
- **RSA-4096 + OAEP SHA-256** for key wrapping and challenge-response authentication
- **Challenge-response auth**: server encrypts a random nonce with the machine's public key; the agent decrypts it to prove private key possession without sending a password
- **Replay protection**: nonces are single-use, stored in Redis with a short TTL
- **Zero-disk**: secrets exist only in process memory on the server — never written to disk
- **Per-machine keys**: each machine gets its own wrapped copy of the AES key — revoking one machine doesn't affect others

## License

MIT
