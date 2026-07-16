---
"g-draft": patch
---

Fix "write EPIPE" crashes when using agentic providers like Kiro and Antigravity. By disabling `stdin` diff injection for providers that natively read the diff file path, we prevent Node.js from stalling on closed OS pipes.
