# g-draft

## 0.4.0

### Minor Changes

- d4f4615: - **TUI Redesign**: Overhauled the interface with a "Minimal & Refined" aesthetic, moving away from technical all-caps/kebab-case to professional Title Case.
  - **Responsive Layout**: Implemented dynamic screen scaling that adapts to terminal resizing, including conditional rendering for small windows.
  - **Project-level Instructions**: Added support for `.gdraft.json` configuration, allowing custom AI instructions to be defined per workspace.
  - **Improved UX & Navigation**: Fixed the instructions editor visibility, enabled the alternate terminal buffer for clean exits, and resolved nested navigation bugs.
  - **Resilient AI Pipeline**: Enhanced provider disposal and error handling to prevent crashes on exit and improved stability for detached CLI mode.
  - **Performance Tuning**: Doubled AI request timeouts and optimized character streaming speed for a snappier interface.

## 0.3.0

### Minor Changes

- b974d3b: ### Minor Changes

  - **Persistent Background Agents**: Implemented background AI processes in the TUI to eliminate "cold start" latency. Generations now start in under 2 seconds.
  - **ACP (Agent Client Protocol) Support**: Full re-architecture of the Gemini provider to support the ACP JSON-RPC standard.
  - **Handshake Pipelining**: Optimized initial AI communication to achieve zero round-trip latency for detached CLI mode.
  - **Real-time Reasoning Visibility**: The TUI now streams agent thoughts and tool calls with a natural typing effect and auto-scrolling progress.
  - **Action-Aware Prompts**: The AI is now explicitly aware of whether it is generating a commit, PR, or audit, enabling better custom instructions.
  - **Streamlined PR UI**: Removed the "Diff Overview" from the PR screen to maximize space for the generated description.
  - **Improved Scrolling**: Added full Vim-style navigation support and smoother scrolling logic to the TUI.
  - **Resilient Logging**: Improved error logging to capture system-level issues like missing dependencies (e.g., ripgrep).

  ### Fixes

  - **TUI Infinite Loop**: Fixed `Maximum update depth exceeded` error caused by unstable hook dependencies in `useLoadingMessages`.
  - **Review screen hang**: Resolved issues where code audits would hang indefinitely by implementing robust request handling and safety timeouts.
  - **Clean Process Exit**: Fixed a bug where background AI agents would keep the Node.js process alive after the TUI was closed.
  - Fixed bug where hitting [Enter] in Custom AI Instructions would clear the field.
  - Fixed race condition in stream completion that left the TUI in a "Thinking" state.

## 0.3.0

### Major Changes

- **Persistent Background Agents**: Implemented background AI processes in the TUI to eliminate "cold start" latency. Generations now start in under 2 seconds.
- **ACP (Agent Client Protocol) Support**: Full re-architecture of the Gemini provider to support the ACP JSON-RPC standard.
- **Handshake Pipelining**: Optimized initial AI communication to achieve zero round-trip latency for detached CLI mode.
- **Real-time Reasoning Visibility**: The TUI now streams agent thoughts and tool calls with a natural typing effect and auto-scrolling progress.

### Minor Changes

- **Performance Telemetry**: Added `durationMs` and `model` tracking to all logs, providing visibility into AI latency and routing.
- **Action-Aware Prompts**: The AI is now explicitly aware of whether it is generating a commit, PR, or audit, enabling better custom instructions.
- **Streamlined PR UI**: Removed the "Diff Overview" from the PR screen to maximize space for the generated description.
- **Improved Scrolling**: Added full Vim-style navigation support and smoother scrolling logic to the TUI.
- **Resilient Logging**: Improved error logging to capture system-level issues like missing dependencies (e.g., ripgrep).

### Fixes

- **TUI Infinite Loop**: Fixed `Maximum update depth exceeded` error caused by unstable hook dependencies in `useLoadingMessages`.
- **Review screen hang**: Resolved issues where code audits would hang indefinitely by implementing a robust request queue and safety timeouts.
- **Clean Process Exit**: Fixed a bug where background AI agents would keep the Node.js process alive after the TUI was closed.
- Fixed infinite loop in TUI when AI providers returned empty responses.
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
