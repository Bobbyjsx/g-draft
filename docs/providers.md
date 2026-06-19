# AI Providers in g-draft

g-draft integrates with several AI providers. Each provider is implemented as a wrapper around its local CLI tool.

## Supported Providers

### Gemini

- **Provider Name**: `gemini`
- **CLI Tool**: `gemini`
- **Installation**: `npm install -g @google/gemini-cli`
- **Standard**: Full **ACP (Agent Client Protocol)** compliance.
- **Optimization**: Uses **Handshake Pipelining** and **Persistent Sessions** in TUI mode to eliminate "cold start" latency.
- **Features**: Supports real-time streaming of thoughts, tool calls, and automated model routing.
- **Telemetry**: Captures `durationMs` and the actual `model` routed by the agent for each generation.
- **Configuration**: `gdraft config set provider gemini`

### Claude

- **Provider Name**: `claude`
- **CLI Tool**: `claude`
- **Installation**: `npm install -g @anthropic-ai/claude-code`
- **Configuration**: `gdraft config set provider claude`

### Codex

- **Provider Name**: `codex`
- **CLI Tool**: `codex`
- **Installation**: Refer to OpenAI Codex documentation.
- **Configuration**: `gdraft config set provider codex`

### Kiro

- **Provider Name**: `kiro`
- **CLI Tool**: `kiro-cli`
- **Installation**: Refer to Kiro Developer documentation.
- **Configuration**: `gdraft config set provider kiro`

## Provider Discovery

g-draft uses the `which` command to detect if a provider's CLI is available on your system. You can check the status of all providers using:

```bash
gdraft providers
```

## Adding Custom Providers

Custom providers can be added by implementing the `AIProvider` interface and adding them to the provider registry in `src/providers/index.ts`.
