import React from 'react';

type Question = {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'checkbox' | 'radio';
  options?: string[];
  placeholder?: string;
  helperText?: string;
  variant?: 'greenbox';
  multiple?: boolean;
  group?: string;
  [key: string]: unknown;
};

interface Props {
  question: Question;
  value: string | number | string[] | null | undefined;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  viewOnly?: boolean;
  answers?: any;
  setAnswers?: React.Dispatch<React.SetStateAction<any>>;
}

const QuestionField: React.FC<Props> = ({ question, value, onChange, disabled, viewOnly, answers, setAnswers }) => {
  const renderValue = () => {
    if (question.type === 'checkbox' && Array.isArray(value)) {
      return value.join(', ');
    }
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  };

  const [isOtherInputFocused, setIsOtherInputFocused] = React.useState(false);

  if (viewOnly) {
    const isLandlord = question.group === 'landlord';
    let displayValue = renderValue() || 'לא צוין';
    if (question.id === 'agreementDate' && displayValue && displayValue !== 'לא צוין') {
      const date = new Date(displayValue);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        displayValue = `${day}.${month}.${year}`;
      }
    }
    return (
      <div className={`flex flex-col mb-4 text-right ${isLandlord ? 'items-start' : 'items-end'}`} dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <span className="text-sm font-medium text-[#1A4D2C] text-right" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', textAlign: 'right' }}>{question.label}</span>
        <span className="text-base font-bold text-[#124E31] mt-1 text-right" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', textAlign: 'right' }}>{displayValue}</span>
      </div>
    );
  }

  if (question.id === 'apartmentFeatures') {
    const baseOptions = [
      'מדיח', 'סלון', 'ארונות קיר', 'מחסן גינה', 'מזגן', 'מקרר',
      'תנור', 'מכונת כביסה', 'מיקרוגל', 'שולחן אוכל', 'מיטה', 'טלוויזיה',
    ];
    const otherKey = 'אחר';
    const valueArr = Array.isArray(value) ? value : [];
    const customFeatures = valueArr.filter(v => !baseOptions.includes(v) && v !== otherKey);
    const [otherInput, setOtherInput] = React.useState('');

    // Keep input in sync if value changes from outside (for tags)
    React.useEffect(() => {
      setOtherInput('');
      // eslint-disable-next-line
    }, [customFeatures.join(', ')]);

    const handleOtherInputAdd = () => {
      const features = otherInput.split(',').map(f => f.trim()).filter(f => f);
      // Only update if there are new features to add
      if (features.length > 0) {
        // Add only features that are not already present
        const toAdd = features.filter(f => !customFeatures.includes(f));
        if (toAdd.length > 0) {
          onChange([...valueArr.filter(v => baseOptions.includes(v)), ...customFeatures, ...toAdd]);
        }
        setOtherInput('');
      }
      // If input is empty, do nothing (keep previous custom features)
    };

    const handleRemoveCustom = (feature: string) => {
      onChange(valueArr.filter(v => v !== feature));
    };

    // Local state for the custom features input
    const [customInput, setCustomInput] = React.useState(customFeatures.join(', '));

    React.useEffect(() => {
      setCustomInput(customFeatures.join(', '));
      // eslint-disable-next-line
    }, [customFeatures.join(', ')]);

    const handleCustomInputBlur = () => {
      const features = customInput.split(',').map(f => f.trim()).filter(f => f);
      onChange([...valueArr.filter(v => baseOptions.includes(v)), ...features]);
    };

    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-3 mt-2 apartment-features-group" style={{ maxWidth: 500 }}>
            {baseOptions.map(opt => {
              const selected = valueArr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-3 py-2 rounded-lg font-medium shadow-sm transition-all apartment-feature-btn"
                  style={{
                    fontSize: 15,
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#fff' : '#124E31',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    minWidth: 80,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                  }}
                  onClick={() => {
                    if (selected) {
                      onChange(valueArr.filter(v => v !== opt));
                    } else {
                      onChange([...valueArr, opt]);
                    }
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        {/* Regular text field for custom features */}
        <input
          type="text"
          className="border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors mt-3"
          placeholder="הוסף תוספות נוספות, מופרדות בפסיק (לדוגמה: תנור, מיקרוגל)"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onBlur={handleCustomInputBlur}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCustomInputBlur(); } }}
          style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
        />
        <div className="mt-1 text-sm text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
          ניתן להוסיף תוספות נוספות, יש להפריד בפסיק ( , )
        </div>
      </div>
    );
  }

  if (question.id === 'hasParking' || question.id === 'hasStorage') {
    const options = ['כן', 'לא'];
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-3 mt-2" style={{ maxWidth: 500 }}>
            {options.map(opt => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-3 py-2 rounded-lg font-medium shadow-sm transition-all"
                  style={{
                    fontSize: 15,
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#fff' : '#124E31',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    minWidth: 80,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                  }}
                  onClick={() => onChange(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (question.id === 'hasParking') {
    const options = ['כן', 'לא'];
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-3 mt-2" style={{ maxWidth: 500 }}>
            {options.map(opt => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-6 py-3 rounded-lg font-medium text-base shadow-sm transition-all"
                  style={{
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#fff' : '#124E31',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    minWidth: 120,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                  }}
                  onClick={() => onChange(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (question.id === 'hasStorage') {
    const options = ['כן', 'לא'];
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-3 mt-2" style={{ maxWidth: 500 }}>
            {options.map(opt => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-6 py-3 rounded-lg font-medium text-base shadow-sm transition-all"
                  style={{
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#fff' : '#124E31',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    minWidth: 120,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                  }}
                  onClick={() => onChange(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (question.variant === 'greenbox' && question.options) {
    const options = question.options as string[];
    const isMulti = question.multiple;
    const selectedValues = isMulti ? (Array.isArray(value) ? value : []) : (typeof value === 'string' ? value : '');

    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-3 mt-2" style={{ maxWidth: 500 }}>
            {options.map(opt => {
              const selected = isMulti ? (selectedValues as string[]).includes(opt) : selectedValues === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-3 py-2 rounded-lg font-medium shadow-sm transition-all"
                  style={{
                    fontSize: 15,
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#fff' : '#124E31',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    minWidth: 80,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                  }}
                  onClick={() => {
                    if (isMulti) {
                      const arr = selectedValues as string[];
                      if (selected) {
                        onChange(arr.filter((v: string) => v !== opt));
                      } else {
                        onChange([...arr, opt]);
                      }
                    } else {
                      onChange(opt);
                    }
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        {question.helperText && (
          <div className="text-xs mt-1 text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{question.helperText}</div>
        )}
      </div>
    );
  }

  if (question.id === 'paymentMethod' && question.options) {
    const options = question.options as string[];
    const [customOther, setCustomOther] = React.useState(typeof value === 'string' && !options.includes(value as string) ? (value as string) : '');
    const isOtherSelected = value === 'אחר' || (!options.includes(value as string) && value);

    React.useEffect(() => {
      if (!isOtherSelected) setCustomOther('');
    }, [value, isOtherSelected]);

    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-3 mt-2" style={{ maxWidth: 500 }}>
            {options.map(opt => {
              const selected = value === opt || (opt === 'אחר' && isOtherSelected);
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-3 py-2 rounded-lg font-medium shadow-sm transition-all"
                  style={{
                    fontSize: 15,
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#fff' : '#124E31',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    minWidth: 80,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                  }}
                  onClick={() => {
                    if (opt === 'אחר') {
                      onChange('אחר');
                    } else {
                      onChange(opt);
                      setCustomOther('');
                    }
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        {isOtherSelected && (
          <input
            type="text"
            className="border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors mt-3"
            placeholder="אנא פרט את אמצעי התשלום"
            value={customOther}
            onChange={e => {
              setCustomOther(e.target.value);
              onChange(e.target.value);
            }}
            style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
          />
        )}
      </div>
    );
  }

  if ((question.id === 'hasExtensionOption' || question.id === 'allowEarlyExit' || question.id === 'lateInterestType' || question.id === 'evacuationPenaltyType') && question.options) {
    const options = question.options as string[];
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-3 mt-2" style={{ maxWidth: 500 }}>
            {options.map(opt => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-3 py-2 rounded-lg font-medium shadow-sm transition-all"
                  style={{
                    fontSize: 15,
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#fff' : '#124E31',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    minWidth: 80,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                  }}
                  onClick={() => onChange(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        {/* Show extra input for fixed amount if selected */}
        {question.id === 'lateInterestType' && value === 'סכום קבוע' && (
          <div className="mt-3">
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              onKeyDown={e => {
                if (["e", "E", "+", "-", "."].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors"
              placeholder="לדוגמה: 50"
              value={answers?.lateInterestFixedAmount || ''}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                setAnswers && setAnswers((prev: any) => ({ ...prev, lateInterestFixedAmount: digits }));
              }}
              style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
            />
          </div>
        )}
        {question.id === 'evacuationPenaltyType' && value === 'לגבות סכום קבוע ליום' && (
          <div className="mt-3">
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              onKeyDown={e => {
                if (["e", "E", "+", "-", "."].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors"
              placeholder="לדוגמה: 100"
              value={answers?.evacuationPenaltyFixedAmount || ''}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                setAnswers && setAnswers((prev: any) => ({ ...prev, evacuationPenaltyFixedAmount: digits }));
              }}
              style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
            />
          </div>
        )}
      </div>
    );
  }

  if (question.id === 'allowPets' || question.id === 'allowSublet' || question.id === 'allowSign' || question.id === 'includeAgreementDetails') {
    const options = question.options || ['כן', 'לא'];
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-3 mt-2" style={{ maxWidth: 500 }}>
            {options.map(opt => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-6 py-3 rounded-lg font-medium text-base shadow-sm transition-all"
                  style={{
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#fff' : '#124E31',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    minWidth: 120,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                  }}
                  onClick={() => onChange(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Special group button style for 'security_types' (multi-select)
  if (question.id === 'security_types' && question.options) {
    const options = question.options as string[];
    const valueArr = Array.isArray(value) ? value : [];
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-1"
            style={{
              width: 404,
              height: 19,
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '19px',
              textAlign: 'right',
              color: '#1A4D2C',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-wrap gap-2 mt-2" dir="rtl">
            {options.map(opt => {
              const selected = valueArr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`px-4 py-2 rounded-lg font-bold transition-colors duration-150 text-sm focus:outline-none ${selected ? 'bg-[#38E18E] text-[#124E31] border-[#38E18E]' : 'bg-white text-[#124E31] border-[#D1D5DB]'}`}
                  style={{
                    border: '2px solid',
                    boxShadow: selected ? '0 2px 8px #38E18E22' : 'none',
                    minWidth: 80,
                    marginBottom: 4,
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 700,
                    textAlign: 'right',
                    cursor: 'pointer',
                    borderColor: selected ? '#38E18E' : '#D1D5DB',
                  }}
                  onClick={() => {
                    if (opt === 'לא נדרש') {
                      onChange([opt]);
                    } else {
                      let newArr = valueArr.includes(opt)
                        ? valueArr.filter(v => v !== opt)
                        : [...valueArr.filter(v => v !== 'לא נדרש'), opt];
                      onChange(newArr);
                    }
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Prevent duplicate input for lateInterestType 'סכום קבוע' (handled above)
  if (question.id === 'lateInterestType' && value === 'סכום קבוע') {
    return null;
  }

  // Default rendering for text, number, date, etc.
  return (
    <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <label
          className="block mb-1"
          style={{
            width: 404,
            fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
            fontStyle: 'normal',
            fontWeight: 500,
            fontSize: 14,
            lineHeight: '19px',
            textAlign: 'right',
            color: '#1A4D2C',
            alignSelf: 'stretch',
            flexGrow: 0,
          }}
        >
          {question.label}
        </label>
        <input
          type={question.type === 'number' ? 'number' : question.type === 'date' ? 'date' : 'text'}
          className="border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors"
          placeholder={question.placeholder || ''}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
        />
      </div>
      {question.helperText && (
        <div className="mt-1 text-sm text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{question.helperText}</div>
      )}
    </div>
  );
};

export default QuestionField; 