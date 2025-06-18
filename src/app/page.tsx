'use client';
import React, { useEffect, useState } from 'react';
import FormRenderer from '../components/FormRenderer';
import contractMerge, { MergeData } from '../utils/contractMerge';
import { Question as QType } from '../utils/visibilityLogic';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Build steps dynamically from groups
const GROUPS = [
  {
    title: 'פרטי המשכיר',
    ids: [
      'landlordName', 'landlordId', 'landlordAddress', 'landlordPhone',
      // In the future, support multiple landlords
    ],
  },
  {
    title: 'פרטי השוכר',
    ids: [
      'tenantName', 'tenantIdNumber', 'tenantCity', 'tenantPhone',
      // In the future, support multiple tenants
    ],
  },
  {
    title: 'פרטי הנכס',
    ids: [
      'propertyCity', 'street', 'apartmentNumber', 'floor', 'entrance', 'apartmentRooms', 'apartmentFeatures', 'hasParking', 'parkingNumber', 'hasStorage', 'storageNumber',
    ],
  },
  {
    title: 'פרטי השכירות',
    ids: [
      'moveInDate', 'rentEndDate', 'hasExtensionOption', 'extensionDuration', 'extensionNoticeDays', 'allowEarlyExit', 'earlyExitCompensation', 'earlyExitCustomCompensation', 'rentalPurpose', 'monthlyRent', 'paymentMethod',
    ],
  },
  {
    title: 'הסכמות נוספות',
    ids: [
      'allowSelfRepair', 'allowPets', 'allowSublet', 'insuranceTypes', 'exitPaintColor',
    ],
  },
  {
    title: 'ביטחונות',
    ids: [
      'guaranteeAmount', 'guarantorsCount', 'guarantor1Name', 'guarantor1Id', 'guarantor1Address', 'guarantor1Phone', 'guarantor2Name', 'guarantor2Id', 'guarantor2Address', 'guarantor2Phone', 'depositAmount', 'hasBankGuarantee', 'bankGuaranteeAmount', 'guaranteeReturnDays',
    ],
  },
  {
    title: 'פרטי חתימה',
    ids: ['allowSign', 'includeAgreementDetails', 'agreementDate', 'agreementCity'],
  },
];

// Brand primary green from image
const PRIMARY_GREEN = '#38E18E';

// Steps: one per group, then summary, then payment, then preview
const STEPS = [
  ...GROUPS.map(g => ({ label: g.title, key: g.title })),
  { label: 'סיכום', key: 'summary' },
  { label: 'תשלום', key: 'payment' },
  { label: 'תצוגה מקדימה', key: 'preview' },
];

// Step explanations for each group/step, בסגנון Lemonade קליל ונעים
const STEP_EXPLANATIONS: Record<string, string> = {
  'פרטי המשכיר': 'בוא נתחיל ממך – כמה פרטים אישיים ונוכל להתקדם.',
  'פרטי השוכר': 'מי הולך לגור בדירה? נוסיף את הפרטים שלהם להסכם.',
  'פרטי הנכס': 'כמה מילים על הדירה עצמה – מה יש בה, איפה היא נמצאת, וכל מה שחשוב לדעת.',
  'פרטי השכירות': 'מתי מתחילים, לכמה זמן, וכמה שכר דירה תבקש – כל מה שקשור לשכירות עצמה.',
  'הסכמות נוספות': 'כמה החלטות קטנות שיכולות לעשות הבדל גדול – חיות, תיקונים, ביטוחים ועוד.',
  'ביטחונות': 'כדי ששני הצדדים ירגישו בטוחים – נוסיף בטחונות מתאימים להסכם.',
};

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

// Helper to check if a step is a tenant step
function isTenantStep(group: { title?: string }) {
  return !!(group.title && (group.title.startsWith('פרטי שוכר') || group.title === 'פרטי השוכר'));
}

export default function HomePage() {
  const [questions, setQuestions] = useState<QType[]>([]);
  const [template, setTemplate] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [contract, setContract] = useState('');
  const [step, setStep] = useState(0);
  const [tenantCount, setTenantCount] = useState<number>(1);

  useEffect(() => {
    // Load questions and template
    import('../../data/full_rental_contract_questions.json').then(mod => setQuestions((mod.default || mod) as QType[]));
    fetch('/data/master-template.txt')
      .then(res => res.text())
      .then(setTemplate);
  }, []);

  useEffect(() => {
    // Merge contract
    // Flatten first landlord/tenant for contract compatibility
    let mergedAnswers = { ...answers };
    if (Array.isArray(answers.landlords) && answers.landlords[0]) {
      mergedAnswers = { ...mergedAnswers, ...answers.landlords[0] };
    }
    if (Array.isArray(answers.tenants) && answers.tenants[0]) {
      mergedAnswers = { ...mergedAnswers, ...answers.tenants[0] };
    }
    // TODO: Support multiple tenants/landlords in contract template
    let merged = contractMerge(template, mergedAnswers as MergeData);
    // Remove conditional blocks (simple MVP: no #if logic)
    merged = merged.replace(/{{#if [^}]+}}([\s\S]*?){{\/if}}/g, (m, content) => {
      // Check if the condition is met
      const match = m.match(/{{#if ([^}]+)}}/);
      if (!match) return '';
      const key = match[1].trim();
      if (mergedAnswers[key]) return content.trim();
      return '';
    });
    setContract(merged);
  }, [template, answers]);

  // Group questions for steps
  let grouped = GROUPS.map(group => ({
    title: group.title,
    questions: questions.filter(q => group.ids.includes(q.id)),
  })).filter(g => g.questions.length > 0);

  // If tenantCount is set, expand tenant steps
  if (tenantCount && tenantCount > 1) {
    const tenantGroupIdx = grouped.findIndex(g => g.title === 'פרטי השוכר');
    if (tenantGroupIdx !== -1) {
      grouped = [
        ...grouped.slice(0, tenantGroupIdx),
        {
          title: 'פרטי השוכר',
          questions: grouped[tenantGroupIdx].questions,
        },
        ...grouped.slice(tenantGroupIdx + 1),
      ];
    }
  }

  // Stepper UI
  function Stepper() {
    const handleStepClick = (stepIndex: number) => {
      // Allow moving to any previous step or the next available step
      if (stepIndex <= step + 1) {
        setStep(stepIndex);
      }
    };

    return (
      <div className="fixed top-0 left-0 w-full z-30 flex justify-center items-center py-2 px-2" style={{ background: 'white', borderBottom: '1px solid #e5e7eb', borderRadius: '0 0 18px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', minHeight: 56 }}>
        <div className="flex justify-center items-end gap-0 w-full overflow-x-auto scrollbar-hide" style={{ alignItems: 'flex-end' }}>
          {STEPS.map((s, i) => (
            <div 
              key={s.key} 
              className="flex flex-col items-center min-w-[72px] mx-1 cursor-pointer" 
              style={{ justifyContent: 'flex-end' }}
              onClick={() => handleStepClick(i)}
            >
              <div
                className={`flex items-center justify-center transition-all duration-200
                  ${i < step
                    ? 'bg-green-500 border-green-500 text-white shadow-md hover:bg-green-600'
                    : i === step
                      ? 'bg-[#38E18E] border-[#38E18E] text-white shadow-lg hover:bg-[#2bc77a]'
                      : i === step + 1
                        ? 'bg-gray-200 border-gray-300 text-gray-400 hover:bg-gray-300'
                        : 'bg-gray-200 border-gray-300 text-gray-400 opacity-50'}
                `}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  borderWidth: 2,
                  fontWeight: 700,
                  fontSize: 18,
                  boxShadow: i === step ? '0 2px 8px rgba(56,225,142,0.18)' : undefined,
                  cursor: i <= step + 1 ? 'pointer' : 'not-allowed',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <div
                className={`mt-2 text-xs text-center transition-all duration-200 ${i === step ? 'font-bold text-gray-900' : 'text-gray-400'}`}
                title={s.label}
                style={{ direction: 'rtl', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 90, minHeight: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Save contract meta to localStorage when answers change
  useEffect(() => {
    // Save to localStorage
    const contractMeta = {
      ...answers,
      // Ensure landlords array exists
      landlords: Array.isArray(answers.landlords) ? answers.landlords : [{}],
      // Ensure tenants array exists
      tenants: Array.isArray(answers.tenants) ? answers.tenants : [{}],
    };
    console.log('Saving contract meta:', contractMeta);
    localStorage.setItem('contractMeta', JSON.stringify(contractMeta));
  }, [answers]);

  // Ensure landlords array exists in answers for step 1
  useEffect(() => {
    if (!Array.isArray(answers.landlords)) {
      setAnswers(a => ({ ...a, landlords: [{}] }));
    }
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center bg-[#EDF5EE] px-4 py-10 text-gray-900" style={{ paddingTop: 80 }} dir="rtl">
      <Stepper />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8 flex flex-col items-center mt-8"
          style={{ alignItems: 'stretch' }}
        >
          {/* Step name/label */}
          <div className="text-xl font-semibold mb-4 text-right text-gray-900" dir="rtl">
            {step < grouped.length ? grouped[step]?.title : STEPS[step]?.label}
          </div>
          {/* Step explanation */}
          {step < grouped.length && (
            <div className="text-sm text-gray-600 mb-6 text-right" dir="rtl" style={{ minHeight: 24 }}>
              {STEP_EXPLANATIONS[grouped[step]?.title?.replace(/פרטי שוכר \d+/, 'פרטי השוכר')] || ''}
            </div>
          )}
          {/* Question group steps */}
          {step < grouped.length && (
            <div className="w-full">
              <FormRenderer
                groups={[grouped[step]]}
                answers={answers}
                setAnswers={setAnswers}
                onComplete={(isTenantStep(grouped[step]) ? undefined : () => setStep(step + 1))}
                onBack={step > 0 ? () => setStep(step - 1) : undefined}
                tenantIndex={'tenantIndex' in grouped[step] ? (grouped[step] as { tenantIndex?: number }).tenantIndex : undefined}
                showContinueButton={isTenantStep(grouped[step])}
                onContinue={() => setStep(step + 1)}
                isLastTenant={isTenantStep(grouped[step]) && step === grouped.length - 1}
              />
            </div>
          )}
          {/* Summary step */}
          {step === grouped.length && (
            <div className="w-full">
              <div className="mb-6 text-center text-gray-900 text-lg font-bold">סיכום התשובות שלך</div>
              <div className="space-y-6">
                {grouped.map((group, idx) => (
                  <div key={group.title} className="border rounded-lg p-4 bg-gray-50">
                    <div className="font-bold mb-2 text-right">{group.title}</div>
                    {/* If this is the tenant group, show each tenant as an inner group */}
                    {group.title === 'פרטי השוכר' && Array.isArray(answers.tenants) && answers.tenants.length > 0 ? (
                      <div className="space-y-4">
                        {answers.tenants.map((tenant: any, tIdx: number) => (
                          <div key={tIdx} className="border border-[#38E18E] rounded p-3 bg-[#F6FFF9]">
                            <div className="font-bold mb-2 text-right" style={{color: '#124E31'}}>{`שוכר ${tIdx + 1}${tenant.tenantName ? `: ${tenant.tenantName}` : ''}`}</div>
                            <ul className="text-right text-sm space-y-1">
                              <li><span className="font-medium">שם:</span> <span className="text-gray-700">{tenant.tenantName || '—'}</span></li>
                              <li><span className="font-medium">ת"ז:</span> <span className="text-gray-700">{tenant.tenantIdNumber || '—'}</span></li>
                              <li><span className="font-medium">עיר מגורים:</span> <span className="text-gray-700">{tenant.tenantCity || '—'}</span></li>
                              <li><span className="font-medium">טלפון:</span> <span className="text-gray-700">{tenant.tenantPhone || '—'}</span></li>
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="text-right text-sm space-y-1">
                        {group.questions.map(q => {
                          let value = answers[q.id];
                          // For landlord fields, use answers.landlords[0]
                          if (group.title === 'פרטי המשכיר' && Array.isArray(answers.landlords) && answers.landlords[0]) {
                            value = answers.landlords[0][q.id];
                          }
                          // For tenant fields, use answers.tenants[0]
                          if (group.title === 'פרטי השוכר' && Array.isArray(answers.tenants) && answers.tenants[0]) {
                            value = answers.tenants[0][q.id];
                          }
                          return (
                            <li key={q.id} className="flex justify-between items-center gap-2">
                              <span className="font-medium">{q.label}:</span>
                              <span className="text-gray-700">{String(value ?? '—')}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <button
                      className="mt-2 text-xs text-blue-600 underline font-bold hover:text-blue-800 transition-colors"
                      onClick={() => setStep(idx)}
                      type="button"
                    >
                      ערוך
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-8">
                <button
                  className="w-full py-3 rounded-lg font-bold text-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  onClick={() => setStep(step - 1)}
                >
                  הקודם
                </button>
                <button
                  className="w-full py-3 rounded-lg font-bold text-lg hover:bg-green-400 transition-colors"
                  style={{ background: PRIMARY_GREEN, color: '#fff' }}
                  onClick={() => setStep(step + 1)}
                >
                  המשך לתשלום
                </button>
              </div>
            </div>
          )}
          {/* Payment step */}
          {step === grouped.length + 1 && (
            <div className="w-full">
              <div className="mb-6 text-center text-gray-700">שלב תשלום</div>
              <form className="space-y-4 mb-4">
                <div>
                  <label className="block mb-1 font-bold">מספר כרטיס</label>
                  <input type="text" className="border rounded px-3 py-2 w-full text-right hover:border-green-400 focus:ring-2 focus:ring-[#38E18E] focus:border-[#38E18E] transition-colors" placeholder="1234 5678 9012 3456" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block mb-1 font-bold">תוקף</label>
                    <input type="text" className="border rounded px-3 py-2 w-full text-right hover:border-green-400 focus:ring-2 focus:ring-[#38E18E] focus:border-[#38E18E] transition-colors" placeholder="MM/YY" />
                  </div>
                  <div className="w-24">
                    <label className="block mb-1 font-bold">CVV</label>
                    <input type="text" className="border rounded px-3 py-2 w-full text-right hover:border-green-400 focus:ring-2 focus:ring-[#38E18E] focus:border-[#38E18E] transition-colors" placeholder="123" />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-bold">שם בעל הכרטיס</label>
                  <input type="text" className="border rounded px-3 py-2 w-full text-right hover:border-green-400 focus:ring-2 focus:ring-[#38E18E] focus:border-[#38E18E] transition-colors" placeholder="שם מלא" />
                </div>
              </form>
              <button
                className="w-full py-3 rounded-lg font-bold text-lg hover:bg-green-400 transition-colors"
                style={{ background: PRIMARY_GREEN, color: '#fff' }}
                onClick={() => setStep(step + 1)}
              >
                המשך לתצוגה מקדימה
              </button>
              {step > 0 && (
                <button
                  className="w-full py-3 rounded-lg font-bold text-lg mt-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  onClick={() => setStep(step - 1)}
                >
                  הקודם
                </button>
              )}
            </div>
          )}
          {/* Preview step */}
          {step === grouped.length + 2 && (
            <div className="w-full">
              {/* Confetti effect on final step */}
              {typeof window !== 'undefined' && contract && (
                <Confetti
                  width={window.innerWidth}
                  height={window.innerHeight}
                  numberOfPieces={250}
                  recycle={false}
                />
              )}
              <div className="mb-6 text-center text-gray-900">תצוגה מקדימה של ההסכם</div>
              <div className="flex gap-2 justify-center">
                <button
                  className="py-2 px-6 rounded-lg font-bold text-lg hover:bg-green-400 transition-colors"
                  style={{ background: PRIMARY_GREEN, color: '#fff' }}
                  onClick={() => {
                    if (contract && contract.trim() !== '') {
                      localStorage.setItem('contractText', contract);
                      // Save all tenants for preview
                      if (answers.tenants) {
                        localStorage.setItem('contractTenants', JSON.stringify(answers.tenants));
                      } else {
                        localStorage.removeItem('contractTenants');
                      }
                      // Store contract meta info for preview header
                      const contractMeta = {
                        contractTitle: 'הסכם שכירות',
                        propertyCity: answers.propertyCity || '',
                        street: answers.street || '',
                        apartmentNumber: answers.apartmentNumber || '',
                      };
                      localStorage.setItem('contractMeta', JSON.stringify(contractMeta));
                      window.open('/contract-preview', '_blank');
                    } else {
                      alert('לא ניתן להציג תצוגה מקדימה – יש למלא את כל השדות הנדרשים בטופס.');
                    }
                  }}
                  disabled={!(contract && contract.trim() !== '')}
                >
                  עמוד תצוגה ייעודי
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
