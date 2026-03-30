# g-draft — AI-Powered Git Assistant (CLI + TUI)

`g-draft` is a hybrid CLI + TUI developer tool that enhances Git workflows using AI. It helps you generate commit messages, pull request descriptions, and perform AI-powered code reviews directly from your terminal.

## Features

- **Smart Commit Generation**: Generate Conventional Commit messages from staged changes.
- **PR Description Generator**: Automatic PR descriptions with template detection.
- **AI Code Review**: Get instant feedback on your changes (bugs, performance, security).
- **Interactive TUI**: A rich terminal interface for reviewing diffs and editing AI outputs.
- **Multi-Provider Support**: Integrates with Gemini, Claude, Codex, and Amazon Q.
- **Modular Architecture**: Easy to extend with new AI providers or commands.

## Installation

### From NPM (Recommended)

Install `gdraft` globally to use it anywhere in your terminal:

```bash
npm install -g gdraft
```

### Local Development Setup

If you want to contribute to `g-draft` or run it from source:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/g-draft.git
   cd g-draft
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Link the package locally**:
   ```bash
   npm link
   ```
   Now you can run `gdraft` from any directory on your machine.

5. **Running in development mode**:
   You can run the TypeScript source directly without building:
   ```bash
   npm run dev -- commit # Runs the commit command
   ```

## AI Provider Setup

`gdraft` requires at least one local AI CLI to be installed. Follow these links for setup instructions:

- **Gemini**: [Gemini CLI Setup](https://github.com/google/gemini-cli) (`npm install -g @google/gemini-cli`)
- **Claude**: [Claude Code Setup](https://github.com/anthropic-ai/claude-code) (`npm install -g @anthropic-ai/claude-code`)
- **Amazon Q**: [Amazon Q Developer CLI](https://aws.amazon.com/q/developer/)
- **Codex**: [OpenAI Codex CLI](https://openai.com/blog/openai-codex)

Once installed, verify they are detected by `gdraft`:
```bash
gdraft providers
```

## Configuration

`gdraft` supports global (`~/.gdraft/config.json`) and project-level (`.gdraft.json`) configuration.

```bash
gdraft config set provider claude
gdraft config set baseBranch main
```

## License

MIT
