# g-draft

## 0.3.0

### Major Changes

- **Persistent Background Agents**: Implemented background AI processes in the TUI to eliminate "cold start" latency. Generations now start almost instantly after the first use.
- **ACP (Agent Client Protocol) Support**: Full re-architecture of the Gemini provider to support the ACP JSON-RPC standard, enabling more robust interaction and tool calls.
- **Handshake Pipelining**: Optimized initial AI communication to achieve zero round-trip latency for detached CLI mode.
- **Real-time Reasoning Visibility**: The TUI now streams agent thoughts and tool calls with a natural typing effect and auto-scrolling progress.

### Minor Changes

- **Action-Aware Prompts**: The AI is now explicitly aware of whether it is generating a commit, PR, or audit, enabling better task-specific performance.
- **Streamlined PR UI**: Removed redundant UI elements from the PR screen to maximize space for the generated description.
- **Improved Scrolling**: Added full Vim-style navigation support (`j`/`k`, `G`, `ctrl+d`/`ctrl+u`) and smoother scrolling logic to the TUI.
- **Resilient Logging**: Improved error logging to capture system-level issues like missing dependencies.

### Fixes

- **TUI Infinite Loop**: Fixed a "Maximum update depth exceeded" error caused by unstable hook dependencies in loading screens.
- **Review screen hang**: Resolved issues where code audits would hang indefinitely by implementing robust request handling and safety timeouts.
- **Clean Process Exit**: Fixed a bug where background AI agents would keep the Node.js process alive after the TUI was closed.
- Fixed bug where hitting [Enter] in Custom AI Instructions would clear the field.
- Fixed race condition in stream completion that left the TUI in a "Thinking" state.

## 0.2.1

### Patch Changes

- 87083f1: COntext aware Loading Text

## 0.2.0

### Minor Changes

- 83f5a48: Fix diff handling in git service

## 0.1.1

### Patch Changes

- 5654269: Update package description
