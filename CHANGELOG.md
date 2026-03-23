# Changelog

All notable changes to `vaultsync-cli` are documented here.

---

## [0.2.2] — 2026-03-23

### Fixed
- `vaultsync grant` was broken after public keys were removed from the machine list response — now fetches the public key via a dedicated `GET /machines/:id` call
- `vaultsync doctor` no longer prints the server URL in output
- `vaultsync init` no longer shows the default server URL in the setup prompt
- `vaultsync register` now correctly times out after 15 seconds instead of hanging indefinitely on network issues
- `vaultsync audit` and all `vaultsync admin` commands now time out after 30 seconds instead of hanging indefinitely

### Security
- `loadConfig` now validates the stored API key format on every read — gives a clear error if credentials are corrupted rather than silently sending a bad key
- `vaultsync doctor` warns when server URL is not HTTPS

---

## [0.1.8] — 2026-03-23

### Added
- `vaultsync admin user reset-key --id <id>` — recover a lost API key; old key is revoked immediately
- `vaultsync admin user deactivate/activate` — suspend or re-enable a user without deleting their data
- `vaultsync admin invite create/list/delete` — manage one-time invite codes for new user registration
- `vaultsync register` now supports open registration (no `--invite` needed when server is in open mode)
- `vaultsync register` auto-logs in after account creation — no need to run `vaultsync login` separately

### Changed
- `vaultsync register --invite` is now optional; whether it is required depends on the server configuration
- `vaultsync login` now rejects keys that do not start with `vs_` before saving credentials

### Fixed
- `vaultsync register` previously required `--invite` even on open-registration servers

---

## [0.1.7] — 2026-03-22

### Added
- `vaultsync register --invite <code> --name <name>` — self-registration using a one-time invite code
- `vaultsync admin` command group — full user and invite management for server owners
  - `admin user create/list/deactivate/activate/delete`
  - `admin invite create/list/delete`

### Changed
- README updated with `[local]` / `[VPS]` labels on each quick-start step
- Enrollment step now documents `sudo vaultsync enroll` requirement (agent writes to `/etc/vaultsync/`)

---

## [0.1.6] — 2026-03-20

### Changed
- `vaultsync login` output no longer shows the server URL (security hardening)

---

## [0.1.5] — 2026-03-19

### Added
- npm package keywords expanded for better discoverability

---

## [0.1.4] — 2026-03-18

### Added
- Initial public release on npm
- `vaultsync login --key <apiKey>`
- `vaultsync secrets push/list/delete`
- `vaultsync machine create/list/revoke/delete`
- `vaultsync grant` — access control between machines and secrets
- `vaultsync audit` — view server-side audit log
