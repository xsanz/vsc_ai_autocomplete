# Local AI Autocomplete

VS Code extension for **inline ghost-text code completion** using **local** (or self-hosted) LLMs via an **OpenAI-compatible** HTTP API. Completions use **Fill-in-the-Middle (FiM)**.

**Specification:** [docs/SPECIFICATION.md](docs/SPECIFICATION.md)  
**Security / data egress:** [docs/SECURITY.md](docs/SECURITY.md)  
**VS Code Extension API (verbatim, from [llms.txt](https://code.visualstudio.com/llms.txt)):** [docs/vscode-api/README.md](docs/vscode-api/README.md)

## Requirements

- VS Code 1.86+
- OpenAI-compatible server (LM Studio, vLLM, llama.cpp server, Ollama OpenAI bridge, etc.)

## Security

- The extension does **not** run in **Restricted Mode** until you trust the workspace.
- The first request to each `baseUrl` **host** asks for one-time approval (editor and related file content, and optional Bearer API key).
- **Manage Approved Servers** revokes a host and clears your stored API key.
- Enabling **debug** may log code snippets in the output channel.

## Setup

1. `npm install` && `npm run compile`
2. Press **F5** to open the Extension Development Host (configure in **that** window)
3. **Settings** → `localAiAutocomplete`:
   - **Base Url** — e.g. `http://192.168.0.18:8000/v1`
   - **Model** — type the **exact model id** from your server (see below)
4. Optional: **Local AI Autocomplete: Set API Key**

### Finding the model id

```bash
curl -s "http://YOUR_HOST:PORT/v1/models"
```

Copy the `id` field (e.g. `nvidia/Qwen3.8-Flash-Next-FP4-Local`) into **Model**.

Optional: **Local AI Autocomplete: Refresh Model List** writes ids to the output log (no picker).

## Commands

| Command | Description |
|---------|-------------|
| Toggle Enabled | Turn completions on/off |
| Refresh Model List | Log available model ids (paste into **Model** yourself) |
| Open Settings | Jump to extension settings |
| Set API Key | Secret storage (field is empty; leave blank to clear) |
| Manage Approved Servers | Revoke per-host approval; clears API key on revoke |
| Show Log | Output channel |

## FiM modes (`localAiAutocomplete.fimMode`)

| Mode | When to use |
|------|-------------|
| `completions` | `POST /v1/completions` with `prompt` only (e.g. **vLLM**) |
| `completions_suffix` | `POST /v1/completions` with `prompt` + `suffix` |
| `template` | CodeLlama-style `fimTemplate` |
| `chat_pseudo_fim` | Escape hatch via chat API (not true FiM) |

## Related context

When **Include Related Context** is enabled (default), the extension may attach **other workspace files** (e.g. types from `implements` / `extends` on the current class) to the model prompt. Resolution is **language-server first**, then workspace file search.

| Setting | Purpose |
|---------|---------|
| `includeRelatedContext` | On by default; set `false` to send **only** the active file to your server |
| `relatedContextMaxChars` / `relatedContextMaxFiles` | Cap payload size |
| `relatedContextStrategy` | `auto`, `lsp_only`, or `heuristic_only` |
| `relatedContextIncludeImports` | Include file-level `use` / `import` / `using` (default on) |
| `relatedContextAllowVendor` | Include resolved `vendor/` and `node_modules/` files (default on; large prompts) |

Install a language extension for best results. Enable **debug** and **Show Log** to see related paths with **`(lsp)`** or **`(heuristic)`**, per-symbol resolve lines, strategy, a **related context snippet** (truncated), editor prefix/suffix snippets, and **API payload** char counts per request. Related + prefix must fit your server context window (lower `prefixMaxChars` or `relatedContextMaxChars` on vLLM if needed).

Details: [docs/RELATED_CONTEXT.md](docs/RELATED_CONTEXT.md)

## Manual API testing (reproduce payload)

Each inline completion **captures** the exact JSON body sent to your server (updated on every request).

1. In the editor, trigger a completion (same cursor/settings you want to test). The capture runs when the extension **calls the API** (not on cache hits—nudge the cursor or wait ~5s if needed).
2. Command Palette:
   - **Local AI Autocomplete: Save Last API Payload to Workspace** — writes `local-ai-last-completions-payload.json` and `local-ai-last-completions-curl.sh` in the workspace root.
   - **Local AI Autocomplete: Copy Last API Payload (JSON)** — clipboard only (handy for large prompts).
3. From the workspace root:

```bash
chmod +x local-ai-last-completions-curl.sh
./local-ai-last-completions-curl.sh
```

Or: `curl ... -d @local-ai-last-completions-payload.json` (see the generated shell script for your `baseUrl`). Set `LOCAL_AI_API_KEY` before running the curl script; the extension never writes your real key into that file.

Payload JSON may contain **full source** from your project — do not commit `local-ai-last-completions-payload.json` or share it publicly. Enable **debug** to log when a payload is captured. If no completion ran yet (or the request was never sent), the commands warn that nothing was captured.

## Development

```bash
npm install
npm run compile
npm test
```

Status bar shows the configured model; click to open settings.
