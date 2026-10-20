# Security and data egress

Local AI Autocomplete sends **editor content** (prefix/suffix around the cursor) and, when enabled, **related workspace files** to the HTTP server you configure in `localAiAutocomplete.baseUrl`. If you set an API key, it is sent on every request as `Authorization: Bearer`.

## Workspace trust

The extension declares `capabilities.untrustedWorkspaces.supported: false`. In **Restricted Mode**, VS Code does not activate the extension; no completions or HTTP requests run until you trust the workspace.

## Per-host approval

Before the first HTTP request to a new host (from `baseUrl`), you must approve that server once. Approvals are stored in **global** extension state (`globalState`), not per workspace. Approving `api.example.com` in one folder applies in all workspaces for your user profile.

Use **Local AI Autocomplete: Manage Approved Servers** to revoke a host. Revoking clears your **global** stored API key (there is one key for all servers).

Host identity uses `new URL(baseUrl).host` (lowercase). `127.0.0.1`, `localhost`, and `[::1]` are separate entries.

## Trusted workspace + malicious settings

A trusted repository can still set `baseUrl` in `.vscode/settings.json` to an attacker-controlled URL. Host approval is the intentional gate: you confirm each hostname before data is sent.

## Payload files and debugging

- **Save Last API Payload** / clipboard commands copy **prompt JSON only** (no API key in the body).
- Generated `local-ai-last-completions-curl.sh` uses `LOCAL_AI_API_KEY` or a placeholder — never your real key.
- Do not commit `local-ai-last-completions-payload.json` or curl scripts; they may contain full source.
- Enabling **debug** may log code fragments in the output channel.

## Remote development

On Remote SSH / WSL / Codespaces, the extension host (and `SecretStorage` for the API key) runs on the **remote** machine where the extension is installed, not necessarily your local laptop.

## Enterprise checklist

- Require workspace trust before developers use the extension.
- Document approved inference endpoints; revoke hosts when decommissioning servers.
- Block or audit egress to non-approved hosts at the network layer if needed.
- Do not store production API keys in shared workspaces; use per-user secret storage via **Set API Key**.
