# Related context (technical supplement)

Language-agnostic attachment of **related workspace files** to completion prompts. Normative summary lives in [SPECIFICATION.md](SPECIFICATION.md) §6.6.

## Scope

- **In scope:** Types referenced on type declarations (`implements`, `extends`, inheritance lists), resolved via LSP or workspace search.
- **Out of scope:** RAG, embeddings, indexing the whole repo, automatically including all open editor tabs.

## Settings

| Key | Default | Description |
|-----|---------|-------------|
| `includeRelatedContext` | `true` | Master switch. Set `false` to send only the active file. |
| `relatedContextMaxChars` | `8192` | Total characters from related files per request. |
| `relatedContextMaxFiles` | `5` | Maximum distinct related files per request. |
| `relatedContextStrategy` | `auto` | `auto`, `lsp_only`, or `heuristic_only`. |

Total prompt size = related + prefix (and suffix per `fimMode`). Stay within your inference server context limit.

## Discovery

1. Scan the first 500 lines of the active document.
2. Extract type names from declaration patterns (shared regexes, no per-language modules).
3. Emit `RelatedSymbolRef` entries with name, position, and kind (`implements` | `extends` | `inherits` | `other`).
4. Sort by kind priority: `implements` → `extends` → `inherits` → `other`.

## Resolution

For each ref (up to `relatedContextMaxFiles`):

1. **LSP** (`auto` / `lsp_only`): `executeDefinitionProvider`, then `executeTypeDefinitionProvider`.
2. **Fallback** (`auto` / `heuristic_only`): `workspace.findFiles` for `**/{Name}.*`, excluding `node_modules`, `vendor`, `.git`; prefer same directory as active file; content-sniff for `interface|class|trait|type|struct` + name.
3. Skip URIs equal to the active document.
4. Read file text; assemble with `// File: {relativePath}\n` headers; truncate to `relatedContextMaxChars`.

Fail-open: errors skip a ref; completion still runs with single-file context if needed.

## Prompt format

Related text is **not** inserted into the editor. It is prepended for the API only.

```
/* --- Related context (reference only; output only what belongs at the cursor) --- */
// File: path/to/MyContract.ts
...

/* --- Current file (cursor at end of prefix) --- */
{editor prefix}
```

### Per `fimMode`

| Mode | Behavior |
|------|----------|
| `completions` | `prompt = wrap(related, prefix)` |
| `completions_suffix` | `prompt = wrap(related, prefix)`; API `suffix` = editor suffix |
| `template` | `prompt = wrap(related, render(template, prefix, suffix))` |
| `chat_pseudo_fim` | Related fenced block prepended to user message |

Post-processing and ghost text use **unwrapped** editor prefix/suffix.

## Limitations

- Declaration syntax that does not match generic patterns (e.g. some parenthesized base lists only) may not be discovered; install a language extension for LSP resolution.
- Multiple declarations in one file may attach several contracts until budgets are exhausted.
- Ambiguous `findFiles` matches may pick the wrong similarly named file; LSP is more reliable.
- Contracts in the **same file** as the cursor are not duplicated via related URIs; they may already appear in the prefix.

## Operations

- **No workspace folder:** related gather returns empty.
- **Multi-root:** search scoped to the folder containing the active file.
- **Cache:** Completion cache key includes `hash(relatedContext)`; related settings change clears cache.
- **Debug:** Output channel logs related file paths and char count when `debug` is enabled.

## Example (neutral)

`MyModel` declares `implements MyContract`. With a language server or fallback resolving `MyContract.ts`, the model prompt includes that file so method names like `getId()` match the contract.
