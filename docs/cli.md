# CLI Usage Reference

`gdraft` provides a powerful CLI for fast, non-interactive workflows. For an interactive experience, use `gdraft tui`.

## Global Options

The following options are available for most commands:

- `-p, --provider <provider>`: AI provider to use (e.g., `gemini`, `claude`, `amazon-q`, `codex`). Overrides your configuration.
- `-h, --help`: Show help for the command.

---

## Commands

### `gdraft commit`
Generate a Conventional Commit message from your staged changes.

**Options:**
- `-p, --provider <provider>`: AI provider to use.
- `-c, --copy`: Automatically copy the generated message to your clipboard.

**Usage:**
```bash
gdraft commit          # Generate and display message
gdraft commit --copy   # Generate, display, and copy to clipboard
```

---

### `gdraft pr`
Generate a structured Pull Request description from your branch changes.

**Options:**
- `-m, --mode <mode>`: Diff mode (`staged`, `branch`, or `auto`). Defaults to `branch`.
- `-b, --base <branch>`: Base branch to diff against. Defaults to `main`.
- `-p, --provider <provider>`: AI provider to use.
- `-c, --copy`: Automatically copy the PR description to your clipboard.

**Usage:**
```bash
gdraft pr              # Generate using default branch mode
gdraft pr --mode staged # Generate from staged changes only
gdraft pr --base develop # Generate diff against 'develop' branch
```

> **Note:** `gdraft pr` is optimized to include all changes on your current branch (including uncommitted working tree changes) by automatically calculating the merge base.

---

### `gdraft review`
Get an AI-powered code review and audit of your changes.

**Options:**
- `-m, --mode <mode>`: Diff mode (`staged`, `branch`, or `auto`). Defaults to `auto`.
- `-b, --base <branch>`: Base branch to diff against. Defaults to `main`.
- `-p, --provider <provider>`: AI provider to use.
- `-c, --copy`: Automatically copy the review results to your clipboard.

**Usage:**
```bash
gdraft review          # Audit your changes
gdraft review --copy    # Audit and copy results to clipboard
```

---

### `gdraft tui`
Launch the high-performance Terminal User Interface for an interactive workflow.

**Usage:**
```bash
gdraft tui
```

---

### `gdraft config`
Manage your `gdraft` configuration.

**Subcommands:**
- `gdraft config list`: View all current configuration values.
- `gdraft config set <key> <value>`: Set a global configuration value.
- `gdraft config get <key>`: View a specific configuration value.

**Example:**
```bash
gdraft config set provider claude
gdraft config set baseBranch develop
```

---

### `gdraft providers`
Check the status of supported AI providers on your system.

**Usage:**
```bash
gdraft providers
```

---

### `gdraft init`
Initialize a `.gdraft.json` configuration file in the current directory.

**Usage:**
```bash
gdraft init
```

---

## Caching & History
All CLI generations (commit messages, PRs, reviews) are automatically saved to your project's history in `~/.gdraft/`. 

- **TUI Persistence:** If you generate a PR on the CLI and then launch `gdraft tui`, your last generation will be instantly available in the PR screen (as long as the code hasn't changed).
- **Audit Logs:** Full logs of every command, including the exact `git diff` commands executed, are stored in `~/.gdraft/projects/[project-id]/logs/`.
