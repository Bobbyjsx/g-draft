import { useEffect, useState } from 'react';

export interface LoadingContext {
  mode?: string;
  branch?: string;
  [key: string]: any;
}

type MessageGenerator = (ctx?: LoadingContext) => string[];

const LOADING_MESSAGES: Record<string, string[] | MessageGenerator> = {
  commit: (ctx) => [
    ctx?.mode === 'staged' ? 'Analyzing your staged changes...' : 'Analyzing changes...',
    ctx?.mode === 'last_commit' ? 'Analyzing last commit...' : 'Identifying key modified files...',
    'Interpreting code modifications...',
    'Summarizing logic changes...',
    'Structuring conventional commit message...',
    'Refining commit summary...',
    'Cleaning up summary...',
    'Almost ready...',
    'This is taking some time :(...',
  ],
  pr: (ctx) => [
    ctx?.branch ? `Comparing branch ${ctx.branch}...` : 'Comparing branch history...',
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

export const useLoadingMessages = (type: 'commit' | 'pr' | 'review', isActive: boolean, context?: LoadingContext) => {
  const [index, setIndex] = useState(0);

  const getMessages = () => {
    const entry = LOADING_MESSAGES[type];
    return typeof entry === 'function' ? entry(context) : entry;
  };

  const [messages, setMessages] = useState<string[]>(getMessages());

  useEffect(() => {
    if (isActive) {
      setMessages(getMessages());
    }
  }, [isActive, type, context?.mode, context?.branch]);

  useEffect(() => {
    if (!isActive) {
      setIndex(0);
      return;
    }

    const interval = setInterval(() => {
      // Randomize selection as requested, but try not to show the same twice in a row if multiple exist
      setIndex((prev) => {
        if (messages.length <= 1) return 0;
        let next = Math.floor(Math.random() * messages.length);
        if (next === prev) next = (next + 1) % messages.length;
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive, messages.length]);

  return messages[index] || 'Processing...';
};
