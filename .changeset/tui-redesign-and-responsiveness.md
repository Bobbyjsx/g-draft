---
"g-draft": minor
---

- **TUI Redesign**: Overhauled the interface with a "Minimal & Refined" aesthetic, moving away from technical all-caps/kebab-case to professional Title Case.
- **Responsive Layout**: Implemented dynamic screen scaling that adapts to terminal resizing, including conditional rendering for small windows.
- **Project-level Instructions**: Added support for `.gdraft.json` configuration, allowing custom AI instructions to be defined per workspace.
- **Improved UX & Navigation**: Fixed the instructions editor visibility, enabled the alternate terminal buffer for clean exits, and resolved nested navigation bugs.
- **Resilient AI Pipeline**: Enhanced provider disposal and error handling to prevent crashes on exit and improved stability for detached CLI mode.
- **Performance Tuning**: Doubled AI request timeouts and optimized character streaming speed for a snappier interface.
