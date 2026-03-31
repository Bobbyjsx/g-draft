import { SKILLS } from './skills.js';

export const PROMPTS = {
  COMMIT: (diff: string) =>
    `
    ${PROMPTS.SYSTEM}

    Generate a Conventional Commit message from this diff.

    Skill: GIT_WORKFLOW
    ${SKILLS.GIT_WORKFLOW}

    Diff:
    ${diff}
      `.trim(),

  PR_NO_TEMPLATE: (diff: string) =>
    `
    ${PROMPTS.SYSTEM}

    Generate a structured Pull Request description from this diff.

    Include:
    - Summary
    - Key Changes (focus on logic and architecture)
    - Motivation
    - Potential Risks or Side Effects

    Omit:
    - Thoughts or personal opinions to the PR description.

    Diff:
    ${diff}
      `.trim(),

  PR_WITH_TEMPLATE: (template: string, diff: string) =>
    `
    ${PROMPTS.SYSTEM}

    Fill this PR template using the provided diff.

    CRITICAL RULES:
    1. NEVER remove or omit any sections, headers, or existing text from the template, except comments.
    2. Only FILL in the information required by the template.
    3. REPLACE placeholders (like "Fixes # (issue)") with actual data if available in the diff, or leave them as is if not.
    4. CHECK [ ] or UNCHECK [x] boxes as appropriate based on the diff.
    5. Maintain the exact formatting and structure of the original template.
    6. Ensure all sections are detailed and accurate.
    7. Do not include any content not explicitly requested in the template.
    8. Avoid adding thoughts or personal opinions to the PR description.
    9. Output only a copy - pastable pr description in line with the template.

    Template:
    ${template}

    Diff:
    ${diff}
      `.trim(),

  REVIEW: (diff: string) =>
    `
    ${PROMPTS.SYSTEM}

    Perform a rigorous code review on this diff.

    Use these imported Audit Skills:

    [SECURITY AUDIT]
    ${SKILLS.SECURITY}

    [CLEAN CODE STANDARDS]
    ${SKILLS.CLEAN_CODE}

    [PERFORMANCE OPTIMIZATION]
    ${SKILLS.PERFORMANCE}

    Feedback Categories:
    - ⚠️ Bug risk
    - ⚡ Performance issue
    - 💡 Suggestion
    - 🔒 Security
    - ♻️ Code repetitions (Identify existing helpers/components or suggest new abstractions)

    Be concise, technical, and highly actionable.

    Diff:
    ${diff}
      `.trim(),

  SUMMARIZE: (diff: string) =>
    `
    Summarize this diff in 3 concise bullet points.

    Diff:
    ${diff}
      `.trim(),
  SYSTEM: `
    You are a senior software engineer and security auditor.
    Your goal is to provide high-quality, actionable feedback and documentation based on code diffs.
    Always prioritize:
    1. Security and Data Safety
    2. Performance and Efficiency
    3. Clean Code and Maintainability
      `.trim(),
};
