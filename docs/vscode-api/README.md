# Visual Studio Code Extension API — full documentation (verbatim)

This directory contains the **complete** Microsoft Extension API documentation as published on the web — **not abridged, not summarized**. Each `.md` file is the official Markdown export from `https://code.visualstudio.com/...` (append `.md` to article URLs).

| | |
|---|---|
| **Catalog index** | [llms.txt](https://code.visualstudio.com/llms.txt) — § Extension API |
| **Live site** | [code.visualstudio.com/api](https://code.visualstudio.com/api) |
| **Article list** | [MANIFEST.json](MANIFEST.json) (paths + URLs + byte sizes) |
| **Refresh** | `bash scripts/sync-vscode-api-docs.sh` from repo root |
| **Copyright** | © Microsoft — see [NOTICE.md](NOTICE.md) |

## Layout (matches llms.txt)

| Folder | Full articles |
|--------|----------------|
| [get-started/](get-started/) | 3 |
| [extension-capabilities/](extension-capabilities/) | 4 |
| [extension-guides/](extension-guides/) | 28 (including [extension-guides/ai/](extension-guides/ai/)) |
| [ux-guidelines/](ux-guidelines/) | 14 |
| [language-extensions/](language-extensions/) | 8 |
| [working-with-extensions/](working-with-extensions/) | 4 |
| [advanced-topics/](advanced-topics/) | 5 |
| [references/](references/) | 9 — includes [references/vscode-api.md](references/vscode-api.md) (~2.3 MB API reference) |
| [api-hub.md](api-hub.md) | API section hub page |

**Total: 77 files** — every link under **Extension API** in [llms.txt](https://code.visualstudio.com/llms.txt).

## Read here

Open any file above in the editor. Example entry points:

- [get-started/your-first-extension.md](get-started/your-first-extension.md)
- [get-started/extension-anatomy.md](get-started/extension-anatomy.md)
- [language-extensions/programmatic-language-features.md](language-extensions/programmatic-language-features.md)
- [references/contribution-points.md](references/contribution-points.md)
- [references/vscode-api.md](references/vscode-api.md)

## Local AI Autocomplete

Product docs only (not part of Microsoft API): [SPECIFICATION.md](../SPECIFICATION.md), [RELATED_CONTEXT.md](../RELATED_CONTEXT.md).  
Repo ↔ API mapping (short): [PROJECT_API_MAP.md](../PROJECT_API_MAP.md).
