export interface Question {
  id: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
  visibleIf?: Record<string, unknown>;
  [key: string]: unknown;
  // ...other properties
}

type Answers = Record<string, unknown>;

/**
 * Determines if a question should be visible based on its visibleIf property and current answers.
 */
export function isQuestionVisible(question: Question, answers: Answers): boolean {
  if (!question.visibleIf) return true;
  return Object.entries(question.visibleIf).every(
    ([key, value]) => answers[key] === value
  );
} 