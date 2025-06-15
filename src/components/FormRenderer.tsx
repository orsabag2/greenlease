import React, { useState } from 'react';
import QuestionField from './QuestionField';
import { isQuestionVisible, Question as QType } from '../utils/visibilityLogic';

type Answers = Record<string, unknown>;

type Group = {
  title: string;
  questions: QType[];
};

interface Props {
  groups: Group[];
  answers: Answers;
  setAnswers: (a: Answers) => void;
  onComplete: () => void;
  onBack?: () => void;
  isLastStep?: boolean;
}

const FormRenderer: React.FC<Props> = ({ groups, answers, setAnswers, onComplete, onBack }) => {
  const [step, setStep] = useState(0);
  const currentGroup = groups[step];
  const isLastStep = step === groups.length - 1;

  if (!currentGroup) {
    return null; // or a loading indicator if you prefer
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLastStep) {
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else setStep(s => Math.max(0, s - 1));
  };

  return (
    <form className="space-y-2" dir="rtl" onSubmit={handleNext}>
      {currentGroup.questions.map(q =>
        isQuestionVisible(q, answers) ? (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={val => setAnswers({ ...answers, [q.id]: val })}
          />
        ) : null
      )}
      <div className="flex gap-2 mt-4">
        {onBack && (
          <button type="button" onClick={handleBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0">הקודם</button>
        )}
        <button type="submit" className="w-full py-3 rounded-lg font-bold text-lg" style={{ background: '#38E18E', color: '#fff' }}>
          הבא
        </button>
      </div>
    </form>
  );
};

export default FormRenderer; 