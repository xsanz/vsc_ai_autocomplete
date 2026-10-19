# Local AI Autocomplete

VS Code extension for **inline ghost-text code completion** using **local** (or self-hosted) LLMs via an **OpenAI-compatible** HTTP API. Completions use **Fill-in-the-Middle (FiM)**.

**Specification:** [docs/SPECIFICATION.md](docs/SPECIFICATION.md)

## Requirements

- VS Code 1.86+
- OpenAI-compatible server (LM Studio, vLLM, llama.cpp server, Ollama OpenAI bridge, etc.)

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
| Set API Key | Secret storage |
| Show Log | Output channel |

## FiM modes (`localAiAutocomplete.fimMode`)

| Mode | When to use |
|------|-------------|
| `completions` | `POST /v1/completions` with `prompt` only (e.g. **vLLM**) |
| `completions_suffix` | `POST /v1/completions` with `prompt` + `suffix` |
| `template` | CodeLlama-style `fimTemplate` |
| `chat_pseudo_fim` | Escape hatch via chat API (not true FiM) |

## Development

```bash
npm install
npm run compile
npm test
```

Status bar shows the configured model; click to open settings.
