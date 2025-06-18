'use client';
import React, { useState } from 'react';
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
}

const FormRenderer: React.FC<Props> = ({ groups, answers, setAnswers, onComplete, onBack, tenantIndex, showContinueButton, onContinue, isLastTenant }) => {
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

  if (isTenantMulti && typeof tenantIndex === 'number') {
    entry = Array.isArray(answers.tenants) ? answers.tenants[tenantIndex] || {} : {};
    visibleQuestions = getVisibleQuestions(entry);
    onChange = (qid, val) => {
      setAnswers((prev: Answers) => {
        const tenants = Array.isArray(prev.tenants) ? [...prev.tenants] : [];
        if (!tenants[tenantIndex]) {
          tenants[tenantIndex] = {};
        }
        tenants[tenantIndex] = { ...tenants[tenantIndex], [qid]: val };
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
        landlords[0] = { ...landlords[0], [qid]: val };
        const updated = { ...prev, landlords };
        return updated;
      });
    };
  } else {
    visibleQuestions = getVisibleQuestions(answers);
    entry = answers;
    onChange = (qid, val) => {
      setAnswers((prev: Answers) => {
        const updated = { ...prev, [qid]: val };
        return updated;
      });
    };
  }

  if (isTenantMulti) {
    // Render all tenants
    const tenants = Array.isArray(answers.tenants) ? answers.tenants : [{}];
    return (
      <div>
        {tenants.map((tenant, idx) => (
          <div key={idx} className="border-2 border-[#38E18E] rounded-xl p-4 mb-4 bg-[#F6FFF9] relative">
            <div className="font-bold text-lg mb-4 text-right" style={{color: '#124E31'}}>
              שוכר {idx + 1}
              {/* Remove button, only if more than one tenant and not the first */}
              {tenants.length > 1 && (
                <button
                  type="button"
                  className="absolute left-4 top-4 text-red-600 font-bold text-base bg-white border border-red-200 rounded px-2 py-1 hover:bg-red-100 transition-colors"
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
            {getVisibleQuestions(tenant).map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={tenant[q.id as string]}
                onChange={val => {
                  setAnswers((prev: Answers) => {
                    const tenantsArr = Array.isArray(prev.tenants) ? [...prev.tenants] : [];
                    tenantsArr[idx] = { ...tenantsArr[idx], [q.id]: val };
                    return { ...prev, tenants: tenantsArr };
                  });
                }}
              />
            ))}
          </div>
        ))}
        {showContinueButton && (
          <>
            <button
              type="button"
              className="w-full py-2 mb-4 rounded-lg font-medium text-base border border-[#38E18E] text-[#124E31] hover:bg-[#F6FFF9] transition-colors"
              onClick={() => {
                setAnswers(prev => ({
                  ...prev,
                  tenants: [...(Array.isArray(prev.tenants) ? prev.tenants : [{}]), {}]
                }));
              }}
            >
              + הוסף שוכר
            </button>
            <div className="flex gap-2">
              {onBack && (
                <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95">הקודם</button>
              )}
              <button type="button" onClick={onContinue} className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31' }}>
                המשך
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {isTenantMulti && typeof tenantIndex === 'number' ? (
        <div className="border-2 border-[#38E18E] rounded-xl p-4 mb-4 bg-[#F6FFF9]">
          <div className="font-bold text-lg mb-4 text-right" style={{color: '#124E31'}}>שוכר {tenantIndex + 1}</div>
          <form className="space-y-2" dir="rtl" onSubmit={e => { e.preventDefault(); if (onComplete) onComplete(); }}>
            {visibleQuestions.map(q => (
              <QuestionField
                key={String(q.id)}
                question={q}
                value={entry[q.id as string]}
                onChange={val => onChange(q.id as string, val)}
              />
            ))}
            <div className="flex gap-2 mt-4">
              {onBack && (
                <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95">הקודם</button>
              )}
              <button type="submit" className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31' }}>
                המשך
              </button>
            </div>
          </form>
        </div>
      ) : (
        <form className="space-y-2" dir="rtl" onSubmit={e => { e.preventDefault(); if (onComplete) onComplete(); }}>
          {visibleQuestions.map(q => (
            <QuestionField
              key={String(q.id)}
              question={q}
              value={entry[q.id as string]}
              onChange={val => onChange(q.id as string, val)}
            />
          ))}
          <div className="flex gap-2 mt-4">
            {onBack && (
              <button type="button" onClick={onBack} className="bg-gray-300 px-4 py-2 rounded w-full font-bold text-lg mt-0 transition-transform duration-150 hover:scale-105 active:scale-95">הקודם</button>
            )}
            <button type="submit" className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95" style={{ background: '#38E18E', color: '#124E31' }}>
              המשך
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FormRenderer; 