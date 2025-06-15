import React from 'react';

type Question = {
  id: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
  [key: string]: unknown;
};

interface Props {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

const QuestionField: React.FC<Props> = ({ question, value, onChange, disabled }) => {
  return (
    <div className="mb-4 text-right" dir="rtl">
      <label className="block mb-1 font-bold">{question.label}</label>
      {question.type === 'text' && (
        <input
          type="text"
          className="border rounded px-3 py-2 w-full text-right"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {question.type === 'select' && question.options && (
        <select
          className="border rounded px-3 py-2 w-full text-right"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">בחר</option>
          {question.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
    </div>
  );
};

export default QuestionField; 