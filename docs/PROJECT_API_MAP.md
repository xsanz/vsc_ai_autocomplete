# This repository ↔ VS Code API (pointers only)

Full Extension API text lives under **[vscode-api/](vscode-api/README.md)** (verbatim Microsoft docs). This file only maps **Local AI Autocomplete** source files to relevant API areas.

**Security / data egress:** [SECURITY.md](SECURITY.md)

| Source | Relevant full docs |
|--------|-------------------|
| `src/extension.ts` | [extension-anatomy.md](vscode-api/get-started/extension-anatomy.md), [activation-events.md](vscode-api/references/activation-events.md), [command.md](vscode-api/extension-guides/command.md) |
| `package.json` `contributes` | [extension-manifest.md](vscode-api/references/extension-manifest.md), [contribution-points.md](vscode-api/references/contribution-points.md) |
| `src/completion/provider.ts` | [programmatic-language-features.md](vscode-api/language-extensions/programmatic-language-features.md) (`InlineCompletionItemProvider`) |
| `src/completion/related/lsp.ts` | [commands.md](vscode-api/references/commands.md) (`executeDefinitionProvider`, …) |
| `src/config.ts` | [contribution-points.md](vscode-api/references/contribution-points.md) (`configuration`), [settings UX](vscode-api/ux-guidelines/settings.md) |
| `src/security/hostTrust.ts`, `httpGate.ts`, `manageServers.ts` | [workspace-trust.md](vscode-api/extension-guides/workspace-trust.md), `globalState` / `SecretStorage` in [vscode-api.md](vscode-api/references/vscode-api.md) |
| `test/vscode-stub.cjs`, `npm test` | [testing-extension.md](vscode-api/working-with-extensions/testing-extension.md) |
| `.vscode/launch.json` | [your-first-extension.md](vscode-api/get-started/your-first-extension.md) (debug Extension Host) |
| Remote / `baseUrl` networking | [extension-host.md](vscode-api/advanced-topics/extension-host.md), [remote-extensions.md](vscode-api/advanced-topics/remote-extensions.md) |
