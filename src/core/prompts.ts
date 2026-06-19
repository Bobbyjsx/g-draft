import { SKILLS } from './skills.js';

export interface PromptOptions {
  customInstructions?: string;
  projectContext?: string;
}

export const PROMPTS = {
  COMMIT: (diffFilePath: string, options: PromptOptions = {}) =>
    `
    CURRENT ACTION: Generating a Commit Message
    ${options.projectContext ? `Project Context: ${options.projectContext}` : ''}

    Generate a Conventional Commit message from the diff.
    CRITICAL RULE: Do NOT wrap your response in markdown code blocks (e.g. \`\`\`). Output raw text only.

    Skill: GIT_WORKFLOW
    ${SKILLS.GIT_WORKFLOW}

    ${options.customInstructions ? `Custom Rules:\n${options.customInstructions}` : ''}
    
    diffFilePath: ${diffFilePath}
      `.trim(),

  PR_NO_TEMPLATE: (diffFilePath: string, options: PromptOptions = {}) =>
    `
    CURRENT ACTION: Generating a Pull Request Description
    ${options.projectContext ? `Project Context: ${options.projectContext}` : ''}

    Generate a structured Pull Request description from the diff.

    Include:
    - Summary
    - Key Changes (focus on logic and architecture)
    - Motivation
    - Potential Risks or Side Effects

    Omit:
    - Thoughts or personal opinions to the PR description.

    ${options.customInstructions ? `Custom Rules:\n${options.customInstructions}` : ''}
    
    diffFilePath: ${diffFilePath}
      `.trim(),

  PR_WITH_TEMPLATE: (template: string, diffFilePath: string, options: PromptOptions = {}) =>
    `
    CURRENT ACTION: Filling a Pull Request Template
    ${options.projectContext ? `Project Context: ${options.projectContext}` : ''}

    Fill this PR template using the diff.

    CRITICAL RULES FOR TEMPLATE:
    1. NEVER remove or omit any sections, headers, or existing text from the template, except comments.
    2. Only FILL in the information required by the template.
    3. REPLACE placeholders (like "Fixes # (issue)") with actual data if available in the diff, or leave them as is if not.
    4. CHECK [ ] or UNCHECK [x] boxes as appropriate based on the diff.
    5. Maintain the exact formatting and structure of the original template.
    6. Ensure all sections are detailed and accurate.
    7. Do not include any content not explicitly requested in the template.
    8. Avoid adding thoughts or personal opinions to the PR description.
    9. Output only a copy - pastable pr description in line with the template.

    ${options.customInstructions ? `Custom Rules:\n${options.customInstructions}` : ''}

    Template:
    ${template}
    
    diffFilePath: ${diffFilePath}
      `.trim(),

  REVIEW: (diffFilePath: string, options: PromptOptions = {}) =>
    `
    CURRENT ACTION: Performing a Code Review (Audit)
    ${options.projectContext ? `Project Context: ${options.projectContext}` : ''}

    Perform a rigorous code review on the diff.

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

    ${options.customInstructions ? `Custom Rules:\n${options.customInstructions}` : ''}
    
    diffFilePath: ${diffFilePath}
      `.trim(),

  SUMMARIZE: (diffFilePath: string) =>
    `
    Summarize the key technical changes in the diff.
    Focus on:
    - Core logic changes
    - New features or components
    - Significant refactors
    - Configuration or dependency updates

    Be concise but specific. Group by category if possible.

    diffFilePath: ${diffFilePath}
      `.trim(),
  SYSTEM: `
    You are a senior software engineer and security auditor.
    Your goal is to provide high-quality, actionable feedback and documentation based on code diffs.
    Always prioritize:
    1. Security and Data Safety
    2. Performance and Efficiency
    3. Clean Code and Maintainability
    
    CRITICAL INSTRUCTION: A 'diffFilePath' property pointing to a temporary file containing the git diff will always be appended to the end of the user instructions. You MUST read the diff content from this file path. Do NOT execute \`git diff\` or run any shell commands to inspect the repository.
    
    CRITICAL RULE: Do NOT include any conversational filler, greetings (e.g., "Hi bob", "Here is the PR..."), or introductory sentences. Output ONLY the raw requested content directly.
      `.trim(),
};
