# AI Providers in g-draft

g-draft integrates with several AI providers. Each provider is implemented as a wrapper around its local CLI tool.

## Supported Providers

### Gemini

- **Provider Name**: `gemini`
- **CLI Tool**: `gemini`
- **Installation**: `npm install -g @google/gemini-cli`
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

### Amazon Q

- **Provider Name**: `amazon-q`
- **CLI Tool**: `q`
- **Installation**: Refer to Amazon Q Developer documentation.
- **Configuration**: `gdraft config set provider amazon-q`

## Provider Discovery

g-draft uses the `which` command to detect if a provider's CLI is available on your system. You can check the status of all providers using:

```bash
gdraft providers
```

## Adding Custom Providers

Custom providers can be added by implementing the `AIProvider` interface and adding them to the provider registry in `src/providers/index.ts`.
