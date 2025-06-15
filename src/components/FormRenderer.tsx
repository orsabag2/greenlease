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
  const currentGroup = groups[0];
  const [questionIdx, setQuestionIdx] = useState(0);

  if (!currentGroup) {
    return null;
  }

  // Detect if this group is for tenants (multi) or landlords (single)
  const isTenantMulti = currentGroup.title === 'פרטי השוכר';
  const isLandlord = currentGroup.title === 'פרטי המשכיר';
  const multiKey = isTenantMulti ? 'tenants' : isLandlord ? 'landlords' : undefined;
  const multiAnswers = multiKey && typeof multiKey === 'string' && Array.isArray(answers[multiKey]) ? (answers[multiKey] as Record<string, unknown>[]) : [{}];

  // Get visible questions for this group (for current entry)
  const getVisibleQuestions = (entry: Record<string, unknown>) => currentGroup.questions.filter(q => isQuestionVisible(q, entry));

  // For single-tenant/landlord, just use answers; for multi, use entry
  let visibleQuestions: QType[] = [];
  let entry: Record<string, unknown> = answers;
  let onChange: (qid: string, val: unknown) => void = (qid, val) => setAnswers({ ...answers, [qid]: val });
  let handleAdd: (() => void) | undefined;
  let handleRemove: ((idx: number) => void) | undefined;
  if (isTenantMulti) {
    entry = multiAnswers[0];
    visibleQuestions = getVisibleQuestions(entry);
    onChange = (qid, val) => {
      if (typeof multiKey === 'string') {
        const updated = multiAnswers.map((e, i) => i === 0 ? { ...e, [String(qid)]: val } : e);
        setAnswers({ ...answers, [multiKey]: updated });
      }
    };
    handleAdd = () => {
      if (typeof multiKey === 'string') {
        setAnswers({ ...answers, [multiKey]: [...multiAnswers, {}] });
      }
    };
    handleRemove = (idx) => {
      if (typeof multiKey === 'string' && multiAnswers.length > 1) {
        setAnswers({ ...answers, [multiKey]: multiAnswers.filter((_, i) => i !== idx) });
      }
    };
  } else if (isLandlord) {
    entry = multiAnswers[0];
    visibleQuestions = getVisibleQuestions(entry);
    onChange = (qid, val) => {
      if (typeof multiKey === 'string') {
        const updated = multiAnswers.map((e, i) => i === 0 ? { ...e, [String(qid)]: val } : e);
        setAnswers({ ...answers, [multiKey]: updated });
      }
    };
  } else {
    visibleQuestions = getVisibleQuestions(answers);
    entry = answers;
    onChange = (qid, val) => setAnswers({ ...answers, [String(qid)]: val });
  }

  const isFirstQuestion = questionIdx === 0;
  const isLastQuestion = questionIdx === visibleQuestions.length - 1;
  const currentQuestion = visibleQuestions[questionIdx];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLastQuestion) {
      onComplete();
      setQuestionIdx(0); // reset for next group
    } else {
      setQuestionIdx(q => q + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstQuestion) {
      setQuestionIdx(q => q - 1);
    } else if (onBack) {
      setQuestionIdx(0);
      onBack();
    }
  };

  if (!currentQuestion) return null;

  return (
    <form className="space-y-2" dir="rtl" onSubmit={handleNext}>
      {/* For multi-tenant, show add/remove only on first question */}
      {isTenantMulti && questionIdx === 0 && (
        <div className="mb-2">
          <button type="button" onClick={handleAdd} className="bg-gray-200 px-4 py-2 rounded font-bold w-full mb-2">הוסף שוכר</button>
          {multiAnswers.length > 1 && (
            <button type="button" onClick={() => handleRemove && handleRemove(0)} className="text-red-500 font-bold ml-2">הסר שוכר</button>
          )}
        </div>
      )}
      <QuestionField
        key={String(currentQuestion.id)}
        question={currentQuestion}
        value={entry[currentQuestion.id as string]}
        onChange={val => onChange(currentQuestion.id as string, val)}
      />
      <div className="flex gap-2 mt-4">
        {(onBack || !isFirstQuestion) && (
          <button type="button" onClick={handleBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0">הקודם</button>
        )}
        <button type="submit" className="w-full py-3 rounded-lg font-bold text-lg" style={{ background: '#38E18E', color: '#124E31' }}>
          {isLastQuestion ? 'סיום' : 'הבא'}
        </button>
      </div>
    </form>
  );
};

export default FormRenderer; 