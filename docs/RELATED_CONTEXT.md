# Related context (technical supplement)

Language-agnostic attachment of **related workspace files** to completion prompts. Normative summary lives in [SPECIFICATION.md](SPECIFICATION.md) §6.6.

## Scope

- **In scope:** Types on declarations (`implements`, `extends`, inheritance lists) plus **file-level imports** (`use`, `import`, `using`), resolved via LSP or workspace search. Vendor / `node_modules` paths are included when resolved (optional disable).
- **Out of scope:** RAG, embeddings, indexing the whole repo, in-class trait `use` inside `{ }`, grouped PHP `use A\{B,C};` (v1), `use function` / `use const`.

## Settings

| Key | Default | Description |
|-----|---------|-------------|
| `includeRelatedContext` | `true` | Master switch. Set `false` to send only the active file. |
| `relatedContextMaxChars` | `8192` | Total characters from related files per request. |
| `relatedContextMaxFiles` | `5` | Maximum distinct related files per request. |
| `relatedContextStrategy` | `auto` | `auto`, `lsp_only`, or `heuristic_only`. |
| `relatedContextIncludeImports` | `true` | Scan file-level imports in addition to declaration lines. |
| `relatedContextAllowVendor` | `true` | Allow `vendor/` and `node_modules/` in fallback search; do not strip LSP hits under those paths. When `false`, vendor paths are skipped (`vendor disabled` in debug log). |

Total prompt size = related + prefix (and suffix per `fimMode`). Stay within your inference server context limit. With `relatedContextAllowVendor` on, a single vendor file (e.g. Eloquent `Model.php`) can consume `relatedContextMaxChars`; raise that cap or lower `prefixMaxChars` on small-context servers. Raise `relatedContextMaxFiles` when many imports apply (e.g. Laravel models).

## Discovery

1. Scan the first 500 lines of the active document.
2. Extract type names from declaration patterns (shared regexes) and, when enabled, file-level import lines (PHP `use`, TS/JS `import`, Java `import`, C# `using`).
3. Emit `RelatedSymbolRef` entries with name, position, and kind (`implements` | `extends` | `inherits` | `import` | `other`).
4. Dedupe by symbol name (highest-priority kind wins), then sort: `implements` → `extends` → `inherits` → `import` → `other`.

## Resolution

For each ref (up to `relatedContextMaxFiles`):

1. **LSP** (`auto` / `lsp_only`): `executeDefinitionProvider`, then `executeTypeDefinitionProvider`.
2. **Fallback** (`auto` / `heuristic_only`): `workspace.findFiles` for `**/{Name}.*`; exclude `.git` always; exclude `vendor` / `node_modules` only when `relatedContextAllowVendor` is `false`. Prefer same directory as active file; content-sniff for `interface|class|trait|type|struct` + name.
3. Skip URIs equal to the active document; skip vendor/`node_modules` when `relatedContextAllowVendor` is `false`.
4. Read file text; assemble with `// File: {relativePath}\n` headers; truncate to `relatedContextMaxChars` (debug: `Related context: truncated (maxChars)`).

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
- Ambiguous `findFiles` matches may pick the wrong similarly named file; LSP is more reliable (especially for PHP `use FQCN` → vendor).
- Each import line may trigger one LSP definition request; large import blocks add latency.
- Contracts in the **same file** as the cursor are not duplicated via related URIs; they may already appear in the prefix.

## Operations

- **No workspace folder:** related gather returns empty.
- **Multi-root:** search scoped to the folder containing the active file.
- **Cache:** Completion cache key includes `hash(relatedContext)`; related settings change clears cache.
- **Debug:** With `debug` enabled, the log shows resolution **strategy** (`auto` / `lsp_only` / `heuristic_only`), paths as `file.php (lsp)` or `(heuristic)`, per-symbol lines (`Related resolve: Symbol → path (source)`), and skipped symbols (`unresolved or excluded`, `same file`, `vendor disabled`). With `debug` off, only file paths without source tags.

## Example (neutral)

`MyModel` declares `implements MyContract`. With a language server or fallback resolving `MyContract.ts`, the model prompt includes that file so method names like `getId()` match the contract.

## Example (PHP / Laravel)

`ProductModel` with `use Illuminate\Database\Eloquent\Model`, `extends Model`, and `implements ProductInterface` can attach the interface, the vendor `Model.php`, and other resolved imports until `relatedContextMaxFiles` / `relatedContextMaxChars` limits apply.
