---
"g-draft": minor
---

 ### Minor Changes
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
