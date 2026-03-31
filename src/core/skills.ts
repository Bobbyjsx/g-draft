/**
 * Specialized rule sets imported/adapted from high-quality community skills (e.g., skills.sh).
 * These are injected into prompts to enhance AI reasoning without requiring local skill installation.
 */

export const SKILLS = {
  /**
   * Adapted from 'clean-code' and 'refactor' skills.
   * Focuses on maintainability and readability.
   */
  CLEAN_CODE: `
- Enforce Single Responsibility Principle (SRP).
- Check for naming clarity and consistency.
- Identify "smelly" code (long methods, deep nesting, magic numbers).
- Suggest modular improvements and clean abstractions.
- Ensure proper error handling (e.g., Early Return pattern).
- Ensure existing code base pattern is fully followed in the changes if applicable.
  `.trim(),

  /**
   * Standard Git workflow rules.
   */
  GIT_WORKFLOW: `
- Follow Conventional Commits specification (feat, fix, chore, docs, style, refactor, perf, test).
- Title must be ≤ 72 characters and in present tense.
- Summary must be clear and specific to the actual code changes.
  `.trim(),

  /**
   * Adapted from 'performance-optimization' skills.
   */
  PERFORMANCE: `
- Identify algorithmic inefficiencies (O(n^2) loops, redundant lookups).
- Spot resource leaks or inefficient I/O operations.
- Evaluate memory usage patterns (large object allocations in loops).
- Check for redundant network requests or database queries.
  `.trim(),
  /**
   * Adapted from 'security-audit' skills.
   * Focuses on vulnerability detection and data safety.
   */
  SECURITY: `
- Identify potential injection vectors (SQL, XSS, OS Command).
- Scan for hardcoded credentials, API keys, or sensitive environment variables.
- Evaluate authentication and authorization logic for bypass risks.
- Check for insecure cryptographic practices.
- Flag risky dependency usage or patterns.
  `.trim(),
};
