# TUI Navigation Guide

The g-draft Terminal UI (TUI) provides an interactive experience for managing your Git workflow with AI assistance.

## Scrolling & Navigation

g-draft supports standard browser-style and **Vim-inspired** scrolling in all scrollable areas (e.g., AGENT PROGRESS, Commit Message, Audit Reports).

- **`j` / `k`**: Scroll down / up by line.
- **`ctrl+d` / `ctrl+u`**: Scroll down / up by half-page.
- **`g` / `G`**: Jump to the top / bottom of the content.
- **`↑ / ↓`**: Standard arrow key navigation.

### Auto-Scrolling Thoughts
The **AGENT PROGRESS** box in the Commit, PR, and Review screens will automatically scroll to the bottom as the agent streams its thought process and tool calls. If you manually scroll up using the keys above, auto-scroll will pause until you reach the bottom again.

---

## Keyboard Shortcuts

### Global Shortcuts

- **`q`**: Quit the TUI.
- **`ctrl + c`**: Force quit the TUI.
- **`esc`**: Navigate back to the Dashboard screen.

### Dashboard Screen

- **`1`**: Open the Commit screen.
- **`2`**: Open the PR screen.
- **`3`**: Open the Review screen.
- **`4`**: Open the Settings screen.

### Commit Screen

- **`a`**: Accept the generated commit message and execute `git commit`.
- **`e`**: Enter edit mode to modify the commit message manually.
- **`r`**: Force regeneration (bypasses cache).
- **`c`**: Copy the current commit message to clipboard.
- **`enter`**: Save changes and return from edit mode.

### PR Screen

- **`e`**: Enter edit mode to modify the pull request description.
- **`r`**: Force regeneration (bypasses cache).
- **`c`**: Copy the current PR description to clipboard.
- **`enter`**: Save changes and return from edit mode.

### Review Screen

- **`r`**: Rerun the AI code review audit.
- **`c`**: Copy the audit report to clipboard.

### Settings Screen

- **`Arrow Keys` / `j/k`**: Navigate through the settings menu.
- **`Enter`**: Open the selected setting or confirm selection.
- **`Esc`**: Save and exit from sub-menus (like Custom AI Instructions).

