#!/usr/bin/env bash
# Download FULL Extension API Markdown (verbatim) per https://code.visualstudio.com/llms.txt
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/docs/vscode-api"

fetch() {
  local url="$1"
  local relpath="$2"
  local dest="$BASE/$relpath"
  mkdir -p "$(dirname "$dest")"
  curl -fsSL "$url" -o "$dest"
  echo "OK $relpath"
}

fetch "https://code.visualstudio.com/api.md" "api-hub.md"

# Get Started
fetch "https://code.visualstudio.com/api/get-started/your-first-extension.md" "get-started/your-first-extension.md"
fetch "https://code.visualstudio.com/api/get-started/extension-anatomy.md" "get-started/extension-anatomy.md"
fetch "https://code.visualstudio.com/api/get-started/wrapping-up.md" "get-started/wrapping-up.md"

# Extension Capabilities
fetch "https://code.visualstudio.com/api/extension-capabilities/overview.md" "extension-capabilities/overview.md"
fetch "https://code.visualstudio.com/api/extension-capabilities/common-capabilities.md" "extension-capabilities/common-capabilities.md"
fetch "https://code.visualstudio.com/api/extension-capabilities/theming.md" "extension-capabilities/theming.md"
fetch "https://code.visualstudio.com/api/extension-capabilities/extending-workbench.md" "extension-capabilities/extending-workbench.md"

# Extension Guides
fetch "https://code.visualstudio.com/api/extension-guides/overview.md" "extension-guides/overview.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/ai-extensibility-overview.md" "extension-guides/ai/ai-extensibility-overview.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/tools.md" "extension-guides/ai/tools.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/mcp.md" "extension-guides/ai/mcp.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/chat.md" "extension-guides/ai/chat.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/chat-tutorial.md" "extension-guides/ai/chat-tutorial.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/language-model.md" "extension-guides/ai/language-model.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/language-model-tutorial.md" "extension-guides/ai/language-model-tutorial.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/language-model-chat-provider.md" "extension-guides/ai/language-model-chat-provider.md"
fetch "https://code.visualstudio.com/api/extension-guides/ai/prompt-tsx.md" "extension-guides/ai/prompt-tsx.md"
fetch "https://code.visualstudio.com/api/extension-guides/command.md" "extension-guides/command.md"
fetch "https://code.visualstudio.com/api/extension-guides/color-theme.md" "extension-guides/color-theme.md"
fetch "https://code.visualstudio.com/api/extension-guides/file-icon-theme.md" "extension-guides/file-icon-theme.md"
fetch "https://code.visualstudio.com/api/extension-guides/product-icon-theme.md" "extension-guides/product-icon-theme.md"
fetch "https://code.visualstudio.com/api/extension-guides/tree-view.md" "extension-guides/tree-view.md"
fetch "https://code.visualstudio.com/api/extension-guides/webview.md" "extension-guides/webview.md"
fetch "https://code.visualstudio.com/api/extension-guides/notebook.md" "extension-guides/notebook.md"
fetch "https://code.visualstudio.com/api/extension-guides/custom-editors.md" "extension-guides/custom-editors.md"
fetch "https://code.visualstudio.com/api/extension-guides/virtual-documents.md" "extension-guides/virtual-documents.md"
fetch "https://code.visualstudio.com/api/extension-guides/virtual-workspaces.md" "extension-guides/virtual-workspaces.md"
fetch "https://code.visualstudio.com/api/extension-guides/web-extensions.md" "extension-guides/web-extensions.md"
fetch "https://code.visualstudio.com/api/extension-guides/workspace-trust.md" "extension-guides/workspace-trust.md"
fetch "https://code.visualstudio.com/api/extension-guides/task-provider.md" "extension-guides/task-provider.md"
fetch "https://code.visualstudio.com/api/extension-guides/scm-provider.md" "extension-guides/scm-provider.md"
fetch "https://code.visualstudio.com/api/extension-guides/debugger-extension.md" "extension-guides/debugger-extension.md"
fetch "https://code.visualstudio.com/api/extension-guides/markdown-extension.md" "extension-guides/markdown-extension.md"
fetch "https://code.visualstudio.com/api/extension-guides/testing.md" "extension-guides/testing.md"
fetch "https://code.visualstudio.com/api/extension-guides/custom-data-extension.md" "extension-guides/custom-data-extension.md"
fetch "https://code.visualstudio.com/api/extension-guides/telemetry.md" "extension-guides/telemetry.md"

# UX Guidelines
for f in overview activity-bar sidebars panel status-bar views editor-actions quick-picks command-palette notifications webviews context-menus walkthroughs settings; do
  fetch "https://code.visualstudio.com/api/ux-guidelines/${f}.md" "ux-guidelines/${f}.md"
done

# Language Extensions
fetch "https://code.visualstudio.com/api/language-extensions/overview.md" "language-extensions/overview.md"
fetch "https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide.md" "language-extensions/syntax-highlight-guide.md"
fetch "https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide.md" "language-extensions/semantic-highlight-guide.md"
fetch "https://code.visualstudio.com/api/language-extensions/snippet-guide.md" "language-extensions/snippet-guide.md"
fetch "https://code.visualstudio.com/api/language-extensions/language-configuration-guide.md" "language-extensions/language-configuration-guide.md"
fetch "https://code.visualstudio.com/api/language-extensions/programmatic-language-features.md" "language-extensions/programmatic-language-features.md"
fetch "https://code.visualstudio.com/api/language-extensions/language-server-extension-guide.md" "language-extensions/language-server-extension-guide.md"
fetch "https://code.visualstudio.com/api/language-extensions/embedded-languages.md" "language-extensions/embedded-languages.md"

# Testing and Publishing
fetch "https://code.visualstudio.com/api/working-with-extensions/testing-extension.md" "working-with-extensions/testing-extension.md"
fetch "https://code.visualstudio.com/api/working-with-extensions/publishing-extension.md" "working-with-extensions/publishing-extension.md"
fetch "https://code.visualstudio.com/api/working-with-extensions/bundling-extension.md" "working-with-extensions/bundling-extension.md"
fetch "https://code.visualstudio.com/api/working-with-extensions/continuous-integration.md" "working-with-extensions/continuous-integration.md"

# Advanced Topics
fetch "https://code.visualstudio.com/api/advanced-topics/extension-host.md" "advanced-topics/extension-host.md"
fetch "https://code.visualstudio.com/api/advanced-topics/remote-extensions.md" "advanced-topics/remote-extensions.md"
fetch "https://code.visualstudio.com/api/advanced-topics/using-proposed-api.md" "advanced-topics/using-proposed-api.md"
fetch "https://code.visualstudio.com/api/advanced-topics/tslint-eslint-migration.md" "advanced-topics/tslint-eslint-migration.md"
fetch "https://code.visualstudio.com/api/advanced-topics/python-extension-template.md" "advanced-topics/python-extension-template.md"

# References
fetch "https://code.visualstudio.com/api/references/vscode-api.md" "references/vscode-api.md"
fetch "https://code.visualstudio.com/api/references/contribution-points.md" "references/contribution-points.md"
fetch "https://code.visualstudio.com/api/references/activation-events.md" "references/activation-events.md"
fetch "https://code.visualstudio.com/api/references/extension-manifest.md" "references/extension-manifest.md"
fetch "https://code.visualstudio.com/api/references/commands.md" "references/commands.md"
fetch "https://code.visualstudio.com/api/references/when-clause-contexts.md" "references/when-clause-contexts.md"
fetch "https://code.visualstudio.com/api/references/theme-color.md" "references/theme-color.md"
fetch "https://code.visualstudio.com/api/references/icons-in-labels.md" "references/icons-in-labels.md"
fetch "https://code.visualstudio.com/api/references/document-selector.md" "references/document-selector.md"

echo "Done. Full articles under $BASE (run from repo root to refresh MANIFEST if needed)."
