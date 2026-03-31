# Contributing to g-draft

We welcome contributions to g-draft! Whether it's reporting bugs, suggesting new features, or submitting pull requests, we value your input.

## Getting Started

1. Fork the repository.
2. Clone your fork: `git clone https://github.com/your-username/g-draft.git`
3. Install dependencies: `pnpm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`
5. Make your changes and commit them: `gdraft commit`
6. Push your branch: `git push origin feature/your-feature-name`
7. Submit a pull request!

## Development

- **Run in development mode**: `pnpm run dev`
- **Build the project**: `pnpm run build`
- **Run tests**: `pnpm run test`

## Project Structure

- `src/cli/`: Command-line interface logic using `commander`.
- `src/tui/`: Terminal UI logic using `ink` and `react`.
- `src/core/`: Central logic for Git operations and configuration.
- `src/providers/`: Pluggable AI provider implementations.

## Adding a New Provider

To add a new AI provider, implement the `AIProvider` interface in `src/providers/index.ts` and add it to the `ALL_PROVIDERS` list.
