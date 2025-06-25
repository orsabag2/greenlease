'use client';
import React, { useState, useEffect } from 'react';
import QuestionField from './QuestionField';
import { isQuestionVisible, Question as QType } from '../utils/visibilityLogic';

type Answers = {
  [key: string]: unknown;
  tenants?: Record<string, unknown>[];
  landlords?: Record<string, unknown>[];
};

type Group = {
  title: string;
  questions: QType[];
};

interface Props {
  groups: Group[];
  answers: Answers;
  setAnswers: (a: Answers | ((prev: Answers) => Answers)) => void;
  onComplete?: () => void;
  onBack?: () => void;
  isLastStep?: boolean;
  tenantIndex?: number;
  showContinueButton?: boolean;
  onContinue?: () => void;
  isLastTenant?: boolean;
  viewOnly?: boolean;
}

const FormRenderer: React.FC<Props> = ({ groups, answers, setAnswers, onComplete, onBack, tenantIndex, showContinueButton, onContinue, isLastTenant, viewOnly }) => {
  const currentGroup = groups[0];
  if (!currentGroup) {
    return null;
  }
  const isTenantMulti = currentGroup.title === 'פרטי השוכר';
  const isLandlord = currentGroup.title === 'פרטי המשכיר';
  const multiKey = isTenantMulti ? 'tenants' : isLandlord ? 'landlords' : undefined;
  const multiAnswers = multiKey && typeof multiKey === 'string' && Array.isArray(answers[multiKey]) ? (answers[multiKey] as Record<string, unknown>[]) : [{}];
  
  // Get visible questions based on the current context
  const getVisibleQuestions = (entry: Record<string, unknown>) => {
    // For tenant/landlord fields, use their specific answers
    if (isTenantMulti || isLandlord) {
      return currentGroup.questions.filter(q => isQuestionVisible(q, entry));
    }
    // For other fields, use the global answers object
    return currentGroup.questions.filter(q => isQuestionVisible(q, answers));
  };

  let visibleQuestions: QType[] = [];
  let entry: Record<string, unknown> = answers;
  let onChange: (qid: string, val: unknown) => void = (qid, val) => {
    setAnswers((prev: Answers) => {
      const updated = { ...prev, [qid]: val };
      return updated;
    });
  };

  // Patch onChange to handle moveInDate logic
  const handleDateLogic = (qid: string, val: unknown, entryObj: Record<string, unknown>, setEntry: (update: Record<string, unknown>) => void) => {
    if (qid === 'moveInDate' && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      // Calculate one year later
      const moveIn = new Date(val);
      const nextYear = new Date(moveIn);
      nextYear.setFullYear(moveIn.getFullYear() + 1);
      // Format as yyyy-mm-dd
      const pad = (n: number) => n.toString().padStart(2, '0');
      const endDate = `${nextYear.getFullYear()}-${pad(nextYear.getMonth() + 1)}-${pad(nextYear.getDate())}`;
      setEntry({ ...entryObj, moveInDate: val, rentEndDate: endDate });
    } else {
      setEntry({ ...entryObj, [qid]: val });
    }
  };

  if (isTenantMulti && typeof tenantIndex === 'number') {
    entry = Array.isArray(answers.tenants) ? answers.tenants[tenantIndex] || {} : {};
    visibleQuestions = getVisibleQuestions(entry);
    onChange = (qid, val) => {
      setAnswers((prev: Answers) => {
        const tenants = Array.isArray(prev.tenants) ? [...prev.tenants] : [];
        if (!tenants[tenantIndex]) {
          tenants[tenantIndex] = {};
        }
        handleDateLogic(qid, val, tenants[tenantIndex], update => { tenants[tenantIndex] = update; });
        const updated = { ...prev, tenants };
        return updated;
      });
    };
  } else if (isLandlord) {
    entry = Array.isArray(answers.landlords) ? answers.landlords[0] || {} : {};
    visibleQuestions = getVisibleQuestions(entry);
    onChange = (qid, val) => {
      setAnswers((prev: Answers) => {
        const landlords = Array.isArray(prev.landlords) ? [...prev.landlords] : [{}];
        handleDateLogic(qid, val, landlords[0], update => { landlords[0] = update; });
        const updated = { ...prev, landlords };
        return updated;
      });
    };
  } else {
    visibleQuestions = getVisibleQuestions(answers);
    entry = answers;
    onChange = (qid, val) => {
      setAnswers((prev: Answers) => {
        let updated: Answers = { ...prev };
        handleDateLogic(qid, val, updated, u => { updated = u; });
        return updated;
      });
    };
  }

  // Group guarantor fields together if they are visible
  const renderQuestions = (questions: QType[]) => {
    const guarantorCountField = questions.find(q => q.id === 'guarantorsCount');
    const guarantor1Fields = questions.filter(q => q.id.startsWith('guarantor1'));
    const guarantor2Fields = questions.filter(q => q.id.startsWith('guarantor2'));
    const otherFields = questions.filter(q => !q.id.startsWith('guarantor') || q.id === 'guaranteeAmount');

    return (
      <>
        {/* Render all non-guarantor fields first */}
        {otherFields.map(q => (
          <div key={String(q.id)} style={{ marginBottom: 20 }}>
            <QuestionField
              question={q}
              value={entry[q.id as string] as string | number | string[] | null | undefined}
              onChange={val => onChange(q.id as string, val)}
              viewOnly={viewOnly}
              answers={answers}
              setAnswers={setAnswers}
            />
          </div>
        ))}

        {/* Render guarantor count field if it exists */}
        {guarantorCountField && (
          <div style={{ marginBottom: 20 }}>
            <QuestionField
              question={guarantorCountField}
              value={entry[guarantorCountField.id as string] as string | number | string[] | null | undefined}
              onChange={val => onChange(guarantorCountField.id as string, val)}
              viewOnly={viewOnly}
              answers={answers}
              setAnswers={setAnswers}
            />
          </div>
        )}

        {/* Render first guarantor fields if they exist */}
        {guarantor1Fields.length > 0 && (
          <div className="border-2 border-[#38E18E] rounded-xl p-4 mb-4 bg-[#F6FFF9] space-y-2">
            <div className="font-bold text-lg mb-4 text-right" style={{color: '#124E31'}}>
              ערב 1
            </div>
            {guarantor1Fields.map(q => (
              <div key={String(q.id)} style={{ marginBottom: 20 }}>
                <QuestionField
                  question={q}
                  value={entry[q.id as string] as string | number | string[] | null | undefined}
                  onChange={val => onChange(q.id as string, val)}
                  viewOnly={viewOnly}
                  answers={answers}
                  setAnswers={setAnswers}
                />
              </div>
            ))}
          </div>
        )}

        {/* Render second guarantor fields if they exist and guarantorsCount is 2 */}
        {guarantor2Fields.length > 0 && entry['guarantorsCount'] === '2' && (
          <div className="border-2 border-[#38E18E] rounded-xl p-4 mb-4 bg-[#F6FFF9] space-y-2">
            <div className="font-bold text-lg mb-4 text-right" style={{color: '#124E31'}}>
              ערב 2
            </div>
            {guarantor2Fields.map(q => (
              <div key={String(q.id)} style={{ marginBottom: 20 }}>
                <QuestionField
                  question={q}
                  value={entry[q.id as string] as string | number | string[] | null | undefined}
                  onChange={val => onChange(q.id as string, val)}
                  viewOnly={viewOnly}
                  answers={answers}
                  setAnswers={setAnswers}
                />
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isTenantMulti) {
    const tenants = Array.isArray(answers.tenants) ? answers.tenants : [{}];
    return (
      <div style={{ fontFamily: 'Rubik, Arial, sans-serif', padding: 24, borderRadius: 8, background: '#fff' }} className={isMobile ? 'mobile-bottom-padding' : ''}>
        {tenants.map((tenant, idx) => (
          <div
            key={idx}
            className={`mb-4 relative ${viewOnly ? 'border-gray-200 bg-gray-50' : ''}`}
            style={{
              border: '2px solid #38E18E',
              borderRadius: 8,
              background: '#F6FFF9',
              padding: isMobile ? 16 : 24,
            }}
          >
            <div className="font-bold text-lg mb-4 text-right" style={{color: viewOnly ? '#4B5563' : '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif'}}>
              שוכר {idx + 1}
            </div>
            {getVisibleQuestions(tenant).map((q) => (
              <div key={q.id} style={{ marginBottom: 20 }}>
                <QuestionField
                  question={q}
                  value={tenant[q.id as string] as string | number | string[] | null | undefined}
                  onChange={val => {
                    setAnswers((prev: Answers) => {
                      const tenantsArr = Array.isArray(prev.tenants) ? [...prev.tenants] : [];
                      tenantsArr[idx] = { ...tenantsArr[idx], [q.id]: val };
                      return { ...prev, tenants: tenantsArr };
                    });
                  }}
                  viewOnly={viewOnly}
                  answers={answers}
                  setAnswers={setAnswers}
                />
              </div>
            ))}
            {!viewOnly && tenants.length > 1 && (
              <button
                type="button"
                className="text-red-600 font-bold bg-white border border-red-200 rounded px-2 py-1 hover:bg-red-100 transition-colors mt-2 remove-tenant-btn"
                style={{
                  fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                  minWidth: 'unset',
                  width: 'auto',
                  fontSize: '0.95rem',
                  zIndex: 2,
                  display: 'block',
                  marginRight: 0,
                  marginLeft: 'auto',
                }}
                onClick={() => {
                  setAnswers((prev: Answers) => {
                    const tenantsArr = Array.isArray(prev.tenants) ? [...prev.tenants] : [];
                    tenantsArr.splice(idx, 1);
                    return { ...prev, tenants: tenantsArr };
                  });
                }}
              >
                הסר
              </button>
            )}
          </div>
        ))}
        {!viewOnly && showContinueButton && (
          <>
            <button
              type="button"
              className="w-full py-2 mb-4 rounded-lg font-medium text-base border border-[#38E18E] text-[#124E31] hover:bg-[#F6FFF9] transition-colors"
              style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
              onClick={() => {
                setAnswers(prev => ({
                  ...prev,
                  tenants: [...(Array.isArray(prev.tenants) ? prev.tenants : [{}]), {}]
                }));
              }}
            >
              + הוסף שוכר
            </button>
            {isMobile ? (
              <div className="mobile-sticky-bottom-bar">
                {onBack && (
                  <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', color: '#124E31' }}>הקודם</button>
                )}
                <button type="button" onClick={onContinue} className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
                  המשך
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {onBack && (
                  <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', color: '#124E31' }}>הקודם</button>
                )}
                <button type="button" onClick={onContinue} className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
                  המשך
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (isLandlord) {
    return (
      <div style={{ fontFamily: 'Rubik, Arial, sans-serif', padding: 24, borderRadius: 8, background: '#fff' }} className={isMobile ? 'mobile-bottom-padding' : ''}>
        {getVisibleQuestions(entry).map((q) => (
          <div key={q.id} style={{ marginBottom: 20 }}>
            <QuestionField
              question={q}
              value={entry[q.id as string] as string | number | string[] | null | undefined}
              onChange={val => onChange(q.id as string, val)}
              viewOnly={viewOnly}
              answers={answers}
              setAnswers={setAnswers}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Rubik, Arial, sans-serif', padding: 24, borderRadius: 8, background: '#fff' }} className={isMobile ? 'mobile-bottom-padding' : ''}>
      {isTenantMulti && typeof tenantIndex === 'number' ? (
        <div className="border-2 border-[#38E18E] rounded-xl p-4 mb-4 bg-[#F6FFF9]">
          <div className="font-bold text-lg mb-4 text-right" style={{color: '#124E31', fontFamily: 'Rubik, Arial, sans-serif'}}>
            שוכר {tenantIndex + 1}
          </div>
          <form className="space-y-2" dir="rtl" onSubmit={e => { e.preventDefault(); if (onComplete) onComplete(); }} style={{ fontFamily: 'Rubik, Arial, sans-serif' }}>
            {renderQuestions(visibleQuestions)}
            {isMobile ? (
              <div className="mobile-sticky-bottom-bar">
                {onBack && (
                  <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', color: '#124E31' }}>הקודם</button>
                )}
                <button type="submit" className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
                  המשך
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-4">
                {onBack && (
                  <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', color: '#124E31' }}>הקודם</button>
                )}
                <button type="submit" className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
                  המשך
                </button>
              </div>
            )}
          </form>
        </div>
      ) : (
        <form className="space-y-2" dir="rtl" onSubmit={e => { e.preventDefault(); if (onComplete) onComplete(); }} style={{ fontFamily: 'Rubik, Arial, sans-serif' }}>
          {renderQuestions(visibleQuestions)}
          {isMobile ? (
            <div className="mobile-sticky-bottom-bar">
              {onBack && (
                <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', color: '#124E31' }}>הקודם</button>
              )}
              <button type="submit" className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
                המשך
              </button>
            </div>
          ) : (
            <div className="flex gap-2 mt-4">
              {onBack && (
                <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95" style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', color: '#124E31' }}>הקודם</button>
              )}
              <button type="submit" className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>
                המשך
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default FormRenderer; 