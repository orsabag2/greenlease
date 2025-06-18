import React from 'react';

type Question = {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: string[];
  placeholder?: string;
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
      {((question.type === 'number') || /id|מספר/i.test(question.id)) && (
        <input
          type="number"
          className="border rounded px-3 py-2 w-full text-right transition-colors hover:border-green-400 focus:ring-2 focus:ring-[#38E18E] focus:border-[#38E18E] focus:shadow-md"
          value={typeof value === 'string' || typeof value === 'number' ? value : ''}
          onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
          disabled={!!disabled}
          placeholder={question.placeholder as string}
          pattern="[0-9]*"
          inputMode="numeric"
          min="0"
          step="1"
        />
      )}
      {question.type === 'date' && (
        <input
          type="date"
          className="border rounded px-3 py-2 w-full text-right transition-colors hover:border-green-400 focus:ring-2 focus:ring-[#38E18E] focus:border-[#38E18E] focus:shadow-md"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          disabled={!!disabled}
          placeholder={question.placeholder as string}
        />
      )}
      {question.type === 'select' && question.options && (
        <select
          className="border rounded px-3 py-2 w-full text-right transition-colors hover:border-green-400 focus:ring-2 focus:ring-[#38E18E] focus:border-[#38E18E] focus:shadow-md"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          disabled={!!disabled}
        >
          <option value="">בחר</option>
          {question.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
      {question.type === 'text' && !/id|מספר/i.test(question.id) && (
        <input
          type="text"
          className="border rounded px-3 py-2 w-full text-right transition-colors hover:border-green-400 focus:ring-2 focus:ring-[#38E18E] focus:border-[#38E18E] focus:shadow-md"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          disabled={!!disabled}
          placeholder={question.placeholder as string}
        />
      )}
    </div>
  );
};

export default QuestionField; 