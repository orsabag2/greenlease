export interface Question {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'radio' | 'date';
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

  return Object.entries(question.visibleIf).every(([key, condition]) => {
    const answer = answers[key];

    // Handle special operators
    if (typeof condition === 'object' && condition !== null) {
      // Handle $ne (not equal) operator
      if ('$ne' in condition) {
        const neValue = condition['$ne'];
        if (Array.isArray(neValue)) {
          return !neValue.some(v => 
            Array.isArray(answer) ? answer.includes(v) : answer === v
          );
        }
        return answer !== neValue;
      }
      // Add more operators here if needed
    }

    // Handle array conditions
    if (Array.isArray(condition)) {
      if (!Array.isArray(answer)) {
        return condition.includes(answer);
      }
      return condition.some(value => answer.includes(value));
    }

    // Handle simple equality
    return answer === condition;
  });
} 