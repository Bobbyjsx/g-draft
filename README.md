# g-draft ✦ AI-Powered Git Assistant

`g-draft` is a hybrid **CLI + TUI** developer tool that turbocharges your Git workflows using high-performance AI. It automates the "boring" parts of version control—like writing commit messages and PR descriptions—while providing expert-level security and performance audits before you even push your code.

---

## ✨ Key Features

### 🤖 AI-Powered Workflow
- **Conventional Commits**: Automatically generates structured, present-tense commit messages (≤ 72 chars) from your staged changes.
- **Context-Aware PRs**: Generates detailed Pull Request descriptions. Automatically detects and fills your project's `.github/pull_request_template.md`.
- **Expert Code Review**: Performs rigorous audits using internalized **Skills** for:
    - 🔒 **Security**: Scans for injection vectors, hardcoded secrets, and auth risks.
    - ⚡ **Performance**: Identifies algorithmic inefficiencies and resource leaks.
    - 🧼 **Clean Code**: Enforces SRP, DRY, and naming consistency.
    - ♻️ **Abstractions**: Identifies code repetitions and suggests helper functions or components.

### 🖥️ High-Performance TUI
- **Interactive Dashboard**: A centralized hub to manage your branch status and AI actions.
- **Browser-Standard Scrolling**: Smooth scrollable areas with a visual scrollbar and full **Vim Keybindings** (`j`/`k`, `g`/`G`, `ctrl+d`/`ctrl+u`).
- **Live Feedback**: Contextual loading messages that cycle through actual analysis phases so you're never left wondering.
- **Accept & Commit**: Review AI suggestions, edit them manually in the TUI, and commit directly with one keystroke.
- **Copy to Clipboard**: Fast `[c]` key shortcut to grab any AI output for use elsewhere.

### 💾 Smart Data & Persistence
- **Global Storage**: All logs and cache are moved out of your workspace and stored in `~/.gdraft/` to keep your repositories clean.
- **Project-Aware Cache**: Returning to a screen? Your last generation is instantly loaded from the cache.
- **Staleness Detection**: Automatically detects if your code has changed since the last AI generation and prompts for a refresh.
- **Audit Logs**: Full prompt/response history stored as structured JSON in `~/.gdraft/projects/[id]/logs`.

---

## 🚀 Installation

### From NPM (Recommended)
Install `gdraft` globally:
```bash
npm install -g gdraft
```

### Local Development Setup
`g-draft` uses **pnpm** for package management.

1. **Clone & Install**:
   ```bash
   git clone https://github.com/Bobbyjsx/g-draft.git
   cd g-draft
   pnpm install
   ```

2. **Development**:
   Run the TypeScript source directly:
   ```bash
   pnpm dev -- tui    # Launch the TUI
   pnpm dev -- commit # CLI mode
   ```

3. **Build**:
   ```bash
   pnpm build
   ```

---

## 🔌 AI Provider Setup

`g-draft` acts as an orchestrator for your local AI CLIs. Ensure at least one is installed and authenticated:

- **Gemini**: `npm install -g @google/gemini-cli`
- **Claude**: `npm install -g @anthropic-ai/claude-code`
- **Amazon Q**: [AWS Q Setup](https://aws.amazon.com/q/developer/)
- **Codex**: [OpenAI Codex Setup](https://openai.com/blog/openai-codex)

Verify detection:
```bash
gdraft providers
```

---

## ⚙️ Configuration

`g-draft` uses a hybrid configuration model:
- **Global Config**: Managed via `gdraft config set ...` (stored in system config).
- **Project Config**: Create a `.gdraft.json` in your repository for project-specific overrides.

```json
{
  "baseBranch": "main",
  "provider": "claude"
}
```

---

## ⌨️ TUI Shortcuts

| Key | Action |
| :--- | :--- |
| `↑/↓` or `j/k` | Scroll content / Navigate menu |
| `Enter` | Select / Save |
| `a` | Accept & Commit (Commit Screen) |
| `e` | Edit AI Output |
| `c` | Copy to Clipboard |
| `r` | Retry / Regenerate |
| `Esc` | Back to Dashboard |
| `q` | Quit |

---

## 📄 License

MIT © [Bobbyjsx](https://github.com/Bobbyjsx)
