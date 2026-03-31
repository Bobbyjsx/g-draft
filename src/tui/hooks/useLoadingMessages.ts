import { useEffect, useState } from 'react';

const LOADING_MESSAGES: Record<string, string[]> = {
  commit: [
    'Analyzing your staged changes...',
    'Identifying key modified files...',
    'Interpreting code modifications...',
    'Summarizing logic changes...',
    'Structuring conventional commit message...',
    'Refining commit summary...',
    'Cleaning up summary...',
    'Almost ready...',
    'This is taking some time :(...',
  ],
  pr: [
    'Comparing branch history...',
    'Scanning all branch diffs...',
    'Identifying core features and fixes...',
    'Applying project PR template...',
    'Generating detailed description...',
    'Organizing change categories...',
    'Formatting final PR markdown...',
    'Cleaning up PR description...',
    'Wrapping up...',
    'This is taking some time :(...',
  ],
  review: [
    'Auditing your code changes...',
    'Searching for potential bugs...',
    'Scanning for security issues...',
    'Analyzing performance impact...',
    'Evaluating code readability...',
    'Generating actionable suggestions...',
    'Formulating review summary...',
    'Cleaning up summary...',
    'Finalizing audit report...',
    'This is taking some time :(...',
  ],
};

export const useLoadingMessages = (type: 'commit' | 'pr' | 'review', isActive: boolean) => {
  const [index, setIndex] = useState(0);
  const messages = LOADING_MESSAGES[type];

  useEffect(() => {
    if (!isActive) {
      setIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [isActive, messages.length]);

  return messages[index];
};
