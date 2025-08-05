import React from 'react';
import { isValidIsraeliId } from '../utils/israeliId';

type Question = {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'checkbox' | 'radio';
  options?: string[];
  placeholder?: string;
  helperText?: string;
  variant?: 'greenbox' | 'dropdown';
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
  const [touched, setTouched] = React.useState(false);

  // Helper: List of phone and numeric field IDs
  const PHONE_FIELD_IDS = [
    'landlordPhone', 'tenantPhone', 'guarantor1Phone', 'guarantor2Phone'
  ];
  const NUMERIC_FIELD_IDS = [
    'apartmentRooms', 'paymentDay', 'monthlyRent', 'extensionDuration', 'extensionNoticeDays', 'extensionRent', 'earlyExitCompensation', 'depositAmount', 'guaranteeReturnDays', 'bankGuaranteeAmount'
  ];

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
        <span className="text-sm font-medium text-[#281D57] text-right" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', textAlign: 'right' }}>{question.label}</span>
        <span className="text-base font-bold text-[#281D57] mt-1 text-right" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', textAlign: 'right' }}>{displayValue}</span>
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

    React.useEffect(() => {
      setOtherInput('');
    }, [customFeatures.join(', ')]);

    const handleOtherInputAdd = () => {
      const features = otherInput.split(',').map(f => f.trim()).filter(f => f);
      if (features.length > 0) {
        const toAdd = features.filter(f => !customFeatures.includes(f));
        if (toAdd.length > 0) {
          onChange([...valueArr.filter(v => baseOptions.includes(v)), ...customFeatures, ...toAdd]);
        }
        setOtherInput('');
      }
    };

    const handleRemoveCustom = (feature: string) => {
      onChange(valueArr.filter(v => v !== feature));
    };

    const [customInput, setCustomInput] = React.useState(customFeatures.join(', '));

    React.useEffect(() => {
      setCustomInput(customFeatures.join(', '));
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
              color: '#281D57',
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
                    color: selected ? '#281d57' : '#281D57',
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

  if (question.id === 'hasParking' || question.id === 'hasStorage' || question.id === 'hasGarden') {
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
              color: '#281D57',
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
                    color: selected ? '#281d57' : '#281D57',
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
              color: '#281D57',
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
                    color: selected ? '#281d57' : '#281D57',
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
              color: '#281D57',
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
                    color: selected ? '#281d57' : '#281D57',
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
              color: '#281D57',
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
                    color: selected ? '#281d57' : '#281D57',
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
              color: '#281D57',
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
                    color: selected ? '#281d57' : '#281D57',
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

  if ((question.id === 'hasExtensionOption' || question.id === 'allowEarlyExit' || question.id === 'earlyExitCompensationType' || question.id === 'lateInterestType' || question.id === 'evacuationPenaltyType') && question.options) {
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
              color: '#281D57',
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
                    color: selected ? '#281d57' : '#281D57',
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
              color: '#281D57',
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
                    color: selected ? '#281d57' : '#281D57',
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

  if (question.id === 'gardenMaintenance') {
    const options = question.options || ['כן', 'לא'];
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label
            className="block mb-3"
            style={{
              width: '100%',
              fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '1.4',
              textAlign: 'right',
              color: '#281D57',
              alignSelf: 'stretch',
              flexGrow: 0,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {question.label}
          </label>
          <div className="flex flex-col gap-3 mt-2" style={{ width: '100%' }}>
            {options.map(opt => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className="px-4 py-3 rounded-lg font-medium shadow-sm transition-all"
                  style={{
                    fontSize: 14,
                    background: selected ? '#38E18E' : '#fff',
                    color: selected ? '#281d57' : '#281D57',
                    border: selected ? '2px solid #38E18E' : '2px solid #D1D5DB',
                    width: 'fit-content',
                    maxWidth: '100%',
                    fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                    fontWeight: 500,
                    boxShadow: selected ? '0 2px 8px #38E18E22' : '0 1px 4px #0001',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.4',
                    minHeight: 'auto',
                    textAlign: 'right',
                    alignSelf: 'flex-start',
                    direction: 'rtl',
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
              color: '#281D57',
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
                  className={`px-4 py-2 rounded-lg font-bold transition-colors duration-150 text-sm focus:outline-none ${selected ? 'bg-[#38E18E] text-[#281D57] border-[#38E18E]' : 'bg-white text-[#281D57] border-[#D1D5DB]'}`}
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

  if (question.id === 'lateInterestType' && value === 'סכום קבוע') {
    return null;
  }

  if ((question.type === 'select' && question.variant === 'dropdown' && question.options) || question.id === 'insuranceTypes') {
    const options = question.options as string[];
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
              color: '#281D57',
              alignSelf: 'stretch',
              flexGrow: 0,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {question.label}
          </label>
          <select
            className="border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors mt-2"
            style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', fontSize: 15, color: '#281D57', background: '#fff', minWidth: 120 }}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
          >
            <option value="" disabled>{question.placeholder || 'בחר אפשרות'}</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (
    question.id === 'tenantIdNumber' ||
    question.id === 'landlordId' ||
    question.id === 'guarantor1Id' ||
    question.id === 'guarantor2Id'
  ) {
    const [localValue, setLocalValue] = React.useState(typeof value === 'string' ? value : '');
    const [localError, setLocalError] = React.useState(false);

    React.useEffect(() => {
      setLocalValue(typeof value === 'string' ? value : '');
      if (!value) setLocalError(false);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, ''); // Only digits
      if (val.length > 9) val = val.slice(0, 9);
      setLocalValue(val);
      onChange(val);
      if (val.length === 9) {
        setTouched(true);
        setLocalError(!isValidIsraeliId(val));
      } else {
        setLocalError(false);
      }
    };

    const handleBlur = () => {
      setTouched(true);
      if (localValue && localValue.length === 9) {
        setLocalError(!isValidIsraeliId(localValue));
      } else if (localValue && localValue.length > 0) {
        setLocalError(true); // Not enough digits
      } else {
        setLocalError(false);
      }
    };

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
              color: '#281D57',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={9}
            className={`border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors${localError ? ' border-red-500 ring-red-200' : ''}`}
            placeholder={question.placeholder || ''}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
          />
        </div>
        {localError && (
          <div className="mt-1 text-sm text-red-600" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
            מספר תעודת זהות לא תקין
          </div>
        )}
        {question.helperText && (
          <div className="mt-1 text-sm text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{question.helperText}</div>
        )}
      </div>
    );
  }

  // Button group for guarantorsCount
  if (question.id === 'guarantorsCount') {
    const options = ['1', '2'];
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
              color: '#281D57',
              alignSelf: 'stretch',
              flexGrow: 0,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
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
                    color: selected ? '#281d57' : '#281D57',
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

  // Room counter for apartmentRooms
  if (question.id === 'apartmentRooms') {
    const [roomValue, setRoomValue] = React.useState<number>(typeof value === 'number' ? value : typeof value === 'string' && value ? parseFloat(value) : 1);

    React.useEffect(() => {
      if (typeof value === 'number') {
        setRoomValue(value);
      } else if (typeof value === 'string' && value) {
        setRoomValue(parseFloat(value));
      } else {
        setRoomValue(1);
      }
    }, [value]);

    const handleIncrement = () => {
      const newValue = roomValue + 0.5;
      setRoomValue(newValue);
      onChange(newValue);
    };

    const handleDecrement = () => {
      const newValue = Math.max(0.5, roomValue - 0.5);
      setRoomValue(newValue);
      onChange(newValue);
    };

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
              color: '#281D57',
              alignSelf: 'stretch',
              flexGrow: 0,
            }}
          >
            {question.label}
          </label>
          <div className="flex items-center justify-start gap-2 sm:gap-3 mt-2">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all hover:bg-gray-100 disabled:opacity-50"
              style={{
                border: '2px solid #D1D5DB',
                color: '#281D57',
                fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              -
            </button>
            <div
              className="px-4 py-2 sm:px-6 sm:py-2 rounded-lg border-2 text-center min-w-[80px] sm:min-w-[100px]"
              style={{
                border: '2px solid #D1D5DB',
                color: '#281D57',
                fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                background: '#fff',
              }}
            >
              {roomValue}
            </div>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all hover:bg-gray-100 disabled:opacity-50"
              style={{
                border: '2px solid #D1D5DB',
                color: '#281D57',
                fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              +
            </button>
          </div>
        </div>
        {question.helperText && (
          <div className="mt-1 text-sm text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{question.helperText}</div>
        )}
      </div>
    );
  }

  // Phone and numeric field logic
  if (PHONE_FIELD_IDS.includes(question.id)) {
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label className="block mb-1" style={{ width: '100%', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', fontWeight: 500, fontSize: 14, color: '#281D57', textAlign: 'right' }}>{question.label}</label>
          <input
            type="tel"
            inputMode="tel"
            pattern="[0-9\-]*"
            className="border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors"
            placeholder={question.placeholder || ''}
            value={value ?? ''}
            onChange={e => onChange(e.target.value.replace(/[^0-9\-]/g, ''))}
            disabled={disabled}
            style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
          />
        </div>
        {question.helperText && (
          <div className="mt-1 text-sm text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{question.helperText}</div>
        )}
      </div>
    );
  }
  if (NUMERIC_FIELD_IDS.includes(question.id)) {
    return (
      <div className="mb-4 text-right" dir="rtl" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <label className="block mb-1" style={{ width: '100%', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', fontWeight: 500, fontSize: 14, color: '#281D57', textAlign: 'right' }}>{question.label}</label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            className="border rounded px-3 py-2 w-full text-right border-[#D1D5DB] focus:border-[#38E18E] focus:ring-2 focus:ring-[#38E18E] transition-colors"
            placeholder={question.placeholder || ''}
            value={value ?? ''}
            onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
            disabled={disabled}
            style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
          />
        </div>
        {question.helperText && (
          <div className="mt-1 text-sm text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{question.helperText}</div>
        )}
      </div>
    );
  }

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
            color: '#281D57',
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