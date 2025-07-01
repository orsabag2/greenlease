'use client';
import React, { useEffect, useState } from 'react';
import FormRenderer from '../components/FormRenderer';
import contractMerge, { MergeData } from '../utils/contractMerge';
import { generateSummarySection } from '../utils/contractMerge';
import { Question as QType } from '../utils/visibilityLogic';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import GmailSignIn from '../components/GmailSignIn';
import { auth, db } from '../utils/firebase';
import type { User } from 'firebase/auth';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

// Build steps dynamically from groups
const GROUPS = [
  {
    title: 'פרטי המשכיר',
    ids: [
      'landlordName', 'landlordId', 'landlordAddress', 'landlordPhone',
    ],
  },
  {
    title: 'פרטי השוכר',
    ids: [
      'tenantName', 'tenantIdNumber', 'tenantCity', 'tenantPhone',
    ],
  },
  {
    title: 'פרטי הנכס',
    innerGroups: [
      {
        title: 'עיר ומיקום',
        ids: ['propertyCity', 'street', 'buildingNumber', 'apartmentNumber', 'floor', 'entrance'],
      },
      {
        title: 'פרטי הדירה',
        ids: ['apartmentRooms', 'apartmentFeatures', 'hasParking', 'parkingNumber', 'hasStorage', 'storageNumber'],
      },
    ],
  },
  {
    title: 'פרטי השכירות',
    ids: [
      'moveInDate', 'rentEndDate', 'hasExtensionOption', 'extensionDuration', 'extensionNoticeDays', 'extensionRent', 'allowEarlyExit', 'earlyExitCompensation', 'earlyExitCustomCompensation', 'monthlyRent', 'paymentDay', 'paymentMethod',
      'lateInterestType', 'lateInterestFixedAmount', 'evacuationPenaltyType',
    ],
  },
  {
    title: 'הסכמות נוספות',
    innerGroups: [
      {
        title: 'הסכמות נוספות',
        ids: [
          'allowPets',
          'allowSublet',
          'allowSign',
          'includeAgreementDetails',
          'agreementDate',
          'agreementCity',
        ],
      },
      {
        title: 'הסכמות נוספות - המשך',
        ids: [
          'insuranceTypes',
          'tenant_utilities',
          'maintenance_responsibility',
          'allow_tenant_fix',
          'tenant_fixes',
        ],
      },
    ],
  },
  {
    title: 'ביטחונות',
    ids: [
      'security_types',
      'guaranteeAmount', 'guarantorsCount',
      'guarantor1Name', 'guarantor1Id', 'guarantor1Address', 'guarantor1Phone',
      'guarantor2Name', 'guarantor2Id', 'guarantor2Address', 'guarantor2Phone',
      'depositAmount', 'bankGuaranteeAmount', 'guaranteeReturnDays',
    ],
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
  'עיר ומיקום': 'באיזה עיר נמצאת הדירה ומה שם הרחוב? (למשל: תל אביב, אבן גבירול 5)',
  'פרטי הדירה': 'כמה חדרים, אילו תוספות יש בדירה (חניה, מחסן וכו").',
  'פרטי השכירות': 'מתי מתחילים, לכמה זמן, וכמה שכר דירה תבקש – כל מה שקשור לשכירות עצמה.',
  'הסכמות נוספות': 'כמה החלטות קטנות שיכולות לעשות הבדל גדול – חיות, תיקונים, ביטוחים ועוד.',
  'הסכמות נוספות - המשך': 'עוד כמה החלטות קטנות שיכולות לעשות הבדל גדול – ביטוחים, אחריות תחזוקה ועוד.',
  'ריבית ועיכוב פינוי': 'מה קורה אם יש איחור בתשלום או בפינוי? נגדיר את התנאים כאן.',
  'ביטחונות': 'כדי ששני הצדדים ירגישו בטוחים – נוסיף בטחונות מתאימים להסכם.',
};

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

// Helper to check if a step is a tenant step
function isTenantStep(group: { title?: string }) {
  return !!(group.title && (group.title.startsWith('פרטי שוכר') || group.title === 'פרטי השוכר'));
}

interface Answers {
  landlords?: Record<string, unknown>[];
  tenants?: Record<string, unknown>[];
  propertyCity?: string;
  street?: string;
  entrance?: string;
  floor?: string;
  apartmentNumber?: string;
  [key: string]: any;
}

// Map step titles to their icon filenames
const STEP_ICONS: Record<string, string> = {
  'פרטי המשכיר': '/question-icons/landlord.png',
  'פרטי השוכר': '/question-icons/tanent.png',
  'עיר ומיקום': '/question-icons/aprtment.png',
  'דירה/קומה/כניסה': '/question-icons/aprtment.png',
  'פרטי הדירה': '/question-icons/aprtment.png',
  'פרטי השכירות': '/question-icons/lease.png',
  'הסכמות נוספות': '/question-icons/agrrements.png',
  'הסכמות נוספות - המשך': '/question-icons/agrrements.png',
  'ריבית ועיכוב פינוי': '/question-icons/lease.png',
  'ביטחונות': '/question-icons/insurance.png',
};

export default function HomePage() {
  const [questions, setQuestions] = useState<QType[]>([]);
  const [template, setTemplate] = useState('');
  const [answers, setAnswers] = useState<Answers>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contractMeta');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          landlords: Array.isArray(parsed.landlords) ? parsed.landlords : [{}],
          tenants: Array.isArray(parsed.tenants) ? parsed.tenants : [{}],
        };
      }
    }
    return {
      landlords: [{}],
      tenants: [{}],
    };
  });
  const [contract, setContract] = useState('');
  const [step, setStep] = useState(0);
  const [tenantCount, setTenantCount] = useState<number>(1);
  const [innerStep, setInnerStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Restore step and innerStep from localStorage on mount (for all users, not just after login)
  useEffect(() => {
    const savedStep = localStorage.getItem('contractStep');
    const savedInnerStep = localStorage.getItem('contractInnerStep');
    if (savedStep !== null && !isNaN(Number(savedStep))) {
      setStep(Number(savedStep));
    }
    if (savedInnerStep !== null && !isNaN(Number(savedInnerStep))) {
      setInnerStep(Number(savedInnerStep));
    }
  }, []);

  // Save step and innerStep to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('contractStep', String(step));
  }, [step]);
  useEffect(() => {
    localStorage.setItem('contractInnerStep', String(innerStep));
  }, [innerStep]);

  useEffect(() => {
    // Load questions and template
    fetch('/data/full_rental_contract_questions.json')
      .then(res => res.json())
      .then(setQuestions);
    fetch('/data/master-template.txt')
      .then(res => res.text())
      .then(setTemplate);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setUser(u);
      setLoadingAuth(false);
      // Do not auto-advance step; always start at 0 (פרטי המשכיר)
    });
    return () => unsubscribe();
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

  // Update the grouped type definition:
  let grouped: { title: string; questions: QType[]; innerGroups?: { title: string; ids: string[] }[] }[] = GROUPS.map(group => {
    return {
      title: group.title,
      questions: group.innerGroups ? [] : questions.filter(q => (group.ids ?? []).includes(q.id)),
      innerGroups: group.innerGroups !== undefined ? group.innerGroups : undefined,
    };
  }).filter(g => g.questions.length > 0 || g.innerGroups !== undefined);

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

  // Calculate the stepper index for Stepper highlighting
  const visibleSteps = grouped;
  const lastVisibleStepIndex = step;

  // Stepper UI
  function Stepper({ currentStep = 0 }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const handleStepClick = (stepIndex: number) => {
      if (stepIndex <= step + 1) {
        setStep(stepIndex);
        setMobileMenuOpen(false);
      }
    };
    // Figma colors
    const green = '#38E18E';
    const darkGreen = '#124E31';
    const gray = '#D1D5DB';
    const textGray = '#7A8B99';
    const activeText = darkGreen;

    const steps = allSteps;

    // Mobile: show only current step and hamburger
    if (isMobile) {
      // Progress bar width
      const progress = Math.max(0, Math.min(1, currentStep / (steps.length - 1)));
      return (
        <>
          <div className="fixed top-0 left-0 w-full z-30 flex flex-col items-center justify-center py-1 px-2 bg-white" style={{ borderBottom: '1.5px solid #E0E7EF', borderRadius: '0 0 18px 18px', minHeight: 36 }}>
            <div className="flex flex-col items-center justify-center w-full gap-2 px-2">
              {/* Progress bar clickable area (RTL: progress from right) */}
              <div
                className="relative w-full max-w-[180px] cursor-pointer"
                style={{ height: 10, minWidth: 60, maxWidth: 180, margin: '0 auto', borderRadius: 8, padding: '0 8px', direction: 'rtl' }}
                onClick={() => setMobileMenuOpen(true)}
                aria-label="הצג את כל השלבים"
              >
                <div style={{ width: '100%', height: 10, background: '#E0E7EF', borderRadius: 6, overflow: 'hidden' }} />
                <div style={{ width: `${progress * 100}%`, height: 10, background: '#38E18E', borderRadius: 6, position: 'absolute', top: 0, right: 0, transition: 'width 0.3s' }} />
              </div>
              {/* Step name and arrow icon, horizontally aligned and centered as a unit */}
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button
                  aria-label="הצג את כל השלבים"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontWeight: 700,
                    color: activeText,
                    fontSize: '1rem',
                    whiteSpace: 'nowrap',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => setMobileMenuOpen(true)}
                >
                  {steps[currentStep]?.label}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 7l3 3 3-3" stroke="#124E31" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            {mobileMenuOpen ? (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-start justify-end" onClick={() => setMobileMenuOpen(false)}>
                <div className="bg-white w-4/5 max-w-xs h-full shadow-lg p-4 flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-lg" style={{ color: activeText }}>שלבים</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-gray-100">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 6L18 18" stroke="#124E31" strokeWidth="2.2" strokeLinecap="round" />
                        <path d="M18 6L6 18" stroke="#124E31" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 overflow-y-auto">
                    {Array.isArray(steps) && steps.length > 0 ? steps.map((s, i) => (
                      <button
                        key={s.key}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg text-right ${i === currentStep ? 'bg-[#38E18E] text-white font-bold' : 'bg-white text-[#124E31]'}`}
                        style={{ fontSize: 15, border: i === currentStep ? '2px solid #38E18E' : '2px solid #D1D5DB' }}
                        onClick={() => handleStepClick(i)}
                      >
                        <span>{i + 1}</span>
                        <span>{s.label}</span>
                      </button>
                    )) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      );
    }

    // Desktop: show full stepper
    return (
      <div className="fixed top-0 left-0 w-full z-30 flex justify-center items-center pt-5 px-2 bg-white" style={{ borderBottom: '1.5px solid #E0E7EF', borderRadius: '0 0 18px 18px', minHeight: 48, paddingBottom: 0 }}>
        <div className="flex justify-center items-start w-full overflow-x-auto scrollbar-hide gap-0" style={{ direction: 'rtl', maxWidth: 900 }}>
          {Array.isArray(steps) && steps.length > 0 ? steps.map((s, i) => (
            <div
              key={s.key}
              className="flex flex-col items-center min-w-[40px] mx-1 cursor-pointer"
              style={{ justifyContent: 'flex-start', alignItems: 'center', height: 70 }}
              onClick={() => handleStepClick(i)}
            >
              <div
                className="flex items-center justify-center transition-all duration-200 font-bold select-none"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${i < currentStep ? green : i === currentStep ? green : gray}`,
                  background: i < currentStep ? green : i === currentStep ? green : '#fff',
                  color: i < currentStep ? '#fff' : i === currentStep ? green : gray,
                  fontSize: 12,
                  position: 'relative',
                  transition: 'background 0.2s, border 0.2s',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  marginBottom: 4,
                }}
              >
                {i < currentStep ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: '0 auto' }}>
                    <path d="M5 9.5L8 12.5L13 7.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div
                className="text-xs text-center transition-all duration-200 font-medium"
                title={s.label}
                style={{
                  color: i === currentStep ? activeText : textGray,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  maxWidth: 50,
                  minHeight: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  fontWeight: i === currentStep ? 700 : 500,
                  fontSize: 12,
                  marginTop: 0,
                  textAlign: 'center',
                }}
              >
                {s.label}
              </div>
            </div>
          )) : null}
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
      tenants: Array.isArray(answers.tenants) ? answers.tenants.map(t => ({
        ...t,
        tenantName: t.tenantName || '',
        tenantIdNumber: t.tenantIdNumber || '',
        tenantCity: t.tenantCity || '',
        tenantPhone: t.tenantPhone || '',
      })) : [{}],
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

  const handleAddTenant = () => {
    setAnswers(prev => ({
      ...prev,
      tenants: [...(Array.isArray(prev.tenants) ? prev.tenants : [{}]), {}]
    }));
  };

  // Before passing answers to FormRenderer and anywhere else, ensure landlords and tenants are always arrays
  const safeAnswers = {
    ...answers,
    landlords: Array.isArray(answers.landlords) ? answers.landlords : [{}],
    tenants: Array.isArray(answers.tenants) ? answers.tenants : [{}],
  };

  // Add useEffect to reset innerStep when step changes
  useEffect(() => { setInnerStep(0); }, [step]);
  // On step change, scroll to top
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const allSteps = [
    ...GROUPS.map(g => ({ label: g.title, key: g.title })),
    { label: 'סיכום', key: 'summary' },
    { label: 'תשלום', key: 'payment' },
    { label: 'תצוגה מקדימה', key: 'preview' },
  ];

  // Add a new effect to update Firestore on every answers change (if user is logged in)
  useEffect(() => {
    if (!user) return;
    // Check if answers object has real data (not just empty landlords/tenants)
    const hasRealData = Object.entries(answers).some(([key, value]) => {
      if (key === 'landlords' || key === 'tenants') {
        // Check if array has at least one non-empty object
        return Array.isArray(value) && value.some(obj => obj && Object.keys(obj).length > 0 && Object.values(obj).some(v => v !== undefined && v !== ''));
      }
      return value !== undefined && value !== '' && value !== null;
    });
    if (!hasRealData) return;
    const saveAnswersToFirestore = async () => {
      try {
        await setDoc(doc(db, 'formAnswers', user.uid), {
          userId: user.uid,
          answers,
          updatedAt: new Date(),
        }, { merge: true });
      } catch (error) {
        console.error('Error saving answers to Firestore:', error);
      }
    };
    saveAnswersToFirestore();
  }, [user, answers]);

  // Detect dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(match.matches);
      const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      match.addEventListener('change', handler);
      return () => match.removeEventListener('change', handler);
    }
  }, []);

  // Render the Gmail Sign-In modal as an overlay on top of the questions, with a light, blurred background
  const showSignInModal = !user && !loadingAuth;

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {showSignInModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(255, 255, 255, 0.11)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 32px rgba(56,225,142,0.15)',
            padding: 40,
            minWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div className="text-2xl font-bold mb-4" style={{ color: '#124E31', fontFamily: 'Noto Sans Hebrew', textAlign: 'center' }}>ברוכים הבאים</div>
            <GmailSignIn />
            <div style={{ marginTop: 24, color: '#124E31', fontWeight: 500, fontSize: 18, textAlign: 'center' }}>עליך להתחבר עם ג׳ימייל כדי להמשיך</div>
          </div>
        </div>
      )}
      <main className={`min-h-screen flex flex-col items-center${isMobile ? ' mobile-bottom-padding' : ''}`} style={{ paddingTop: 80, background: isMobile ? '#fff' : '#EDF5EE' }} dir="rtl">
        <Stepper currentStep={step} />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className={isMobile ? 'w-full bg-white rounded-none p-0 flex flex-col items-center mt-20' : 'w-full max-w-xl bg-white rounded-xl shadow-lg p-8 flex flex-col items-center mt-20'}
            style={isMobile ? { alignItems: 'stretch', boxShadow: 'none', borderRadius: 0 } : { alignItems: 'stretch' }}
          >
            {/* All other steps only if user is signed in */}
            {user ? (
              <div style={{ width: '100%' }}>
                {/* Step name/label and explanation */}
                {step < grouped.length && (
                  <>
                    {(() => {
                      let iconKey = grouped[step]?.title;
                      if (grouped[step]?.innerGroups && grouped[step]?.innerGroups.length > 0) {
                        const innerTitle = grouped[step]?.innerGroups?.[innerStep]?.title;
                        if (innerTitle && STEP_ICONS[innerTitle]) {
                          iconKey = innerTitle;
                        }
                      }
                      return STEP_ICONS[iconKey] ? (
                        <div className="flex flex-col items-center w-full mb-4">
                          <img
                            src={STEP_ICONS[iconKey]}
                            alt={iconKey + ' Icon'}
                            style={{ width: 92, height: 70, marginBottom: 8 }}
                          />
                        </div>
                      ) : null;
                    })()}
                    <div className="flex flex-col items-center w-full" style={isMobile ? { marginBottom: 2, marginTop: 2 } : { marginBottom: 4 }}>
                      <div
                        className="text-xl font-semibold text-center"
                        dir="rtl"
                        style={isMobile ? {
                          width: '100%',
                          fontFamily: 'Noto Sans Hebrew',
                          fontWeight: 700,
                          fontSize: 15,
                          lineHeight: '18px',
                          textAlign: 'center',
                          color: '#1A4D2C',
                          margin: 0,
                          padding: 0,
                        } : {
                          width: 404,
                          height: 27,
                          fontFamily: 'Noto Sans Hebrew',
                          fontStyle: 'normal',
                          fontWeight: 700,
                          fontSize: 20,
                          lineHeight: '27px',
                          textAlign: 'center',
                          color: '#1A4D2C',
                          alignSelf: 'center',
                          flexGrow: 0,
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}
                      >
                        {grouped[step]?.title}
                      </div>
                      <div
                        className="text-sm text-center"
                        dir="rtl"
                        style={isMobile ? {
                          width: '100%',
                          fontFamily: 'Noto Sans Hebrew',
                          fontWeight: 400,
                          fontSize: 12,
                          lineHeight: '15px',
                          textAlign: 'center',
                          color: '#1A4D2C',
                          margin: 0,
                          padding: 0,
                        } : {
                          width: 404,
                          height: 19,
                          fontFamily: 'Noto Sans Hebrew',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          fontSize: 14,
                          lineHeight: '19px',
                          textAlign: 'center',
                          color: '#1A4D2C',
                          alignSelf: 'center',
                          flexGrow: 0,
                          marginBottom: 24,
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}
                      >
                        {grouped[step]?.innerGroups && grouped[step]?.innerGroups.length > 0
                          ? STEP_EXPLANATIONS[grouped[step]?.innerGroups?.[innerStep]?.title ?? '']
                          : STEP_EXPLANATIONS[grouped[step]?.title?.replace(/פרטי שוכר \\d+/, 'פרטי השוכר')] || ''}
                      </div>
                    </div>
                  </>
                )}
                {/* Question group steps */}
                {step < grouped.length && (
                  <div className="w-full">
                    {/* If this is the property step with innerGroups, show only one innerGroup at a time */}
                    {grouped[step]?.innerGroups && grouped[step]?.innerGroups.length > 0 ? (
                      <FormRenderer
                        groups={[{
                          title: grouped[step]?.innerGroups?.[innerStep]?.title ?? '',
                          questions: questions.filter(q => grouped[step]?.innerGroups?.[innerStep]?.ids?.includes(q.id)),
                        }]}
                        answers={safeAnswers}
                        setAnswers={setAnswers}
                        onComplete={() => {
                          if (grouped[step]?.innerGroups && innerStep < grouped[step].innerGroups.length - 1) {
                            setInnerStep(innerStep + 1);
                          } else {
                            setStep(step + 1);
                            setInnerStep(0);
                          }
                        }}
                        onBack={innerStep > 0 ? () => setInnerStep(innerStep - 1) : (step > 0 ? () => { setStep(step - 1); setInnerStep(0); } : undefined)}
                      />
                    ) : (
                      <FormRenderer
                        groups={[grouped[step]]}
                        answers={safeAnswers}
                        setAnswers={setAnswers}
                        onComplete={isTenantStep(grouped[step]) ? undefined : () => setStep(step + 1)}
                        onBack={step > 0 ? () => setStep(step - 1) : undefined}
                        tenantIndex={'tenantIndex' in grouped[step] ? (grouped[step] as { tenantIndex?: number }).tenantIndex : undefined}
                        showContinueButton={isTenantStep(grouped[step])}
                        onContinue={() => setStep(step + 1)}
                        isLastTenant={isTenantStep(grouped[step]) && step === grouped.length - 1}
                      />
                    )}
                    {grouped[step]?.title === 'פרטי המשכיר' && (
                      <button
                        type="button"
                        className="w-full py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95 mt-6 mx-auto block"
                        style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif', textAlign: 'center' }}
                        onClick={() => setStep(step + 1)}
                      >
                        המשך
                      </button>
                    )}
                  </div>
                )}
                {/* Summary step */}
                {step === grouped.length && (
                  <div className="w-full flex flex-col items-center justify-center min-h-[60vh]">
                    {/* Final icon */}
                    <div className="flex flex-col items-center w-full mb-4">
                      <img
                        src="/question-icons/final.png"
                        alt="סיכום Icon"
                        style={{ width: 80, height: 60, marginBottom: 8 }}
                      />
                    </div>
                    {/* Title and subtitle, consistent with other steps */}
                    <div className="flex flex-col items-center w-full" style={{ marginBottom: 4 }}>
                      <div
                        className="text-lg font-semibold text-center"
                        dir="rtl"
                        style={{
                          width: 404,
                          height: 24,
                          fontFamily: 'Noto Sans Hebrew',
                          fontStyle: 'normal',
                          fontWeight: 700,
                          fontSize: 17,
                          lineHeight: '24px',
                          textAlign: 'center',
                          color: '#1A4D2C',
                          alignSelf: 'center',
                          flexGrow: 0,
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}
                      >
                        סיכום התשובות שלך
                      </div>
                      <div
                        className="text-xs text-center"
                        dir="rtl"
                        style={{
                          width: 404,
                          height: 16,
                          fontFamily: 'Noto Sans Hebrew',
                          fontStyle: 'normal',
                          fontWeight: 500,
                          fontSize: 12,
                          lineHeight: '16px',
                          textAlign: 'center',
                          color: '#124E31',
                        }}
                      >
                        רגע לפני שממשיכים, הנה כל מה שמילאת עד עכשיו. אפשר לערוך כל חלק בנפרד.
                      </div>
                    </div>
                    <div className="max-w-2xl w-full flex flex-col gap-6 mb-8" dir="rtl">
                      {grouped.flatMap((group, groupIdx) => {
                        if (group.title === 'פרטי השוכר' && Array.isArray(answers.tenants)) {
                          return answers.tenants.map((tenant, tenantIdx) => (
                            <div key={group.title + tenantIdx} className="bg-white border border-[#38E18E] rounded-2xl shadow p-6 text-right summary-green-card" dir="rtl">
                              <div className="font-bold text-lg mb-3 text-right" style={{ color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{group.title + ' ' + (tenantIdx + 1)}</div>
                              <div className="flex flex-col gap-6 text-right" dir="rtl">
                                {group.questions.map(q => {
                                  if (!q) return null;
                                  // Use tenant-specific answers for visibility and value
                                  const isVisible = require('../utils/visibilityLogic').isQuestionVisible(q, tenant);
                                  if (!isVisible) return null;
                                  let value = tenant[q.id];
                                  if (Array.isArray(value)) value = value.join(', ');
                                  const displayValue = (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) ? 'לא צוין' : value;
                                  return (
                                    <div key={q.id} className="flex flex-col items-end mb-2 text-right" dir="rtl">
                                      <span className="text-sm font-medium text-[#1A4D2C] text-right" style={{ fontFamily: 'Noto Sans Hebrew', textAlign: 'right' }}>{q.label}</span>
                                      <span className="text-base font-bold text-[#124E31] mt-1 text-right" style={{ fontFamily: 'Noto Sans Hebrew', textAlign: 'right' }}>{displayValue}</span>
                                    </div>
                                  );
                                }).filter(x => x != null)}
                              </div>
                              <div className="flex justify-end mt-2">
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 underline font-bold hover:text-blue-800 transition-colors"
                                  onClick={() => setStep(groupIdx)}
                                >
                                  ערוך
                                </button>
                              </div>
                            </div>
                          )).filter(Boolean);
                        } else {
                          if (!group) return [];
                          const node = (
                            <div key={group.title} className="bg-white border border-[#38E18E] rounded-2xl shadow p-6 text-right summary-green-card" dir="rtl">
                              <div className="font-bold text-lg mb-3 text-right" style={{ color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{group.title}</div>
                              <div className="flex flex-col gap-6 text-right" dir="rtl">
                                {(group.innerGroups ? group.innerGroups.flatMap(g => g.ids) : group.questions.map(q => q.id)).map(qid => {
                                  const q = questions.find(qq => qq.id === qid);
                                  if (!q) return null;
                                  if (!require('../utils/visibilityLogic').isQuestionVisible(q, answers)) return null;
                                  let value;
                                  if (group.title === 'פרטי המשכיר' && Array.isArray(answers.landlords)) {
                                    value = answers.landlords[0]?.[qid];
                                  } else {
                                    value = answers[qid];
                                  }
                                  if (Array.isArray(value)) value = value.join(', ');
                                  const displayValue = (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) ? 'לא צוין' : value;
                                  return (
                                    <div key={q.id} className="flex flex-col items-end mb-2 text-right" dir="rtl">
                                      <span className="text-sm font-medium text-[#1A4D2C] text-right" style={{ fontFamily: 'Noto Sans Hebrew', textAlign: 'right' }}>{q.label}</span>
                                      <span className="text-base font-bold text-[#124E31] mt-1 text-right" style={{ fontFamily: 'Noto Sans Hebrew', textAlign: 'right' }}>{displayValue}</span>
                                    </div>
                                  );
                                }).filter(x => x != null)}
                              </div>
                              <div className="flex justify-end mt-2">
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 underline font-bold hover:text-blue-800 transition-colors"
                                  onClick={() => setStep(groupIdx)}
                                >
                                  ערוך
                                </button>
                              </div>
                            </div>
                          );
                          return node ? [node] : [];
                        }
                      })}
                    </div>
                    {isMobile ? (
                      <div className="mobile-sticky-bottom-bar">
                        <button
                          type="button"
                          className="w-full max-w-2xl py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95"
                          style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
                          onClick={() => setStep(step + 1)}
                        >
                          המשך
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full max-w-2xl py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95"
                        style={{ background: '#38E18E', color: '#124E31', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
                        onClick={() => setStep(step + 1)}
                      >
                        המשך
                      </button>
                    )}
                  </div>
                )}
                {/* Payment step */}
                {step === grouped.length + 1 && (
                  <div className="w-full">
                    <div className="mb-6 text-center text-gray-700">שלב תשלום</div>
                    {/* Contract preview snapshot styled as in contract-preview page, shrunk to 70% size, tags removed, with fade-out */}
                    <div
                      className="contract-container mb-8 flex justify-center items-center"
                      style={{
                        maxWidth: 900,
                        width: '100%',
                        minHeight: 320,
                        padding: '8px 0',
                        justifyContent: 'center',
                        alignItems: 'center',
                        display: 'flex',
                      }}
                    >
                      <div
                        style={{
                          transform: isMobile ? 'scale(0.7)' : 'scale(0.7)',
                          transformOrigin: 'top center',
                          width: isMobile ? '100vw' : '260mm',
                          height: isMobile ? '260mm' : '190mm',
                          pointerEvents: 'auto',
                          boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
                          borderRadius: 6,
                          overflow: 'hidden',
                          background: '#fff',
                          border: '2px solid var(--contract-border)',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          margin: isMobile ? '0 auto' : undefined,
                        }}
                      >
                        <div className="page" style={{ height: 1000, width: '100%', overflow: 'hidden', position: 'relative', padding: '32px 32px 0 32px', boxShadow: 'none', border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                          <div className="contract-title text-center font-bold text-4xl underline mb-0 mt-2" style={{ fontFamily: 'var(--contract-font)', width: '100%' }}>
                            הסכם שכירות למגורים
                          </div>
                          <div className="contract-subtitle text-center text-lg text-gray-800 mb-3 font-medium" style={{ fontFamily: 'var(--contract-font)', width: '100%' }}>
                            (שכירות בלתי מוגנת)
                          </div>
                          <div className="contract-date-row text-center text-base text-gray-800 mb-3" style={{ fontFamily: 'var(--contract-font)', width: '100%' }}>
                            שנעשה ונחתם ב_______, בתאריך _______.
                          </div>
                          <div className="contract-preview" style={{ fontFamily: 'var(--contract-font)', fontSize: '1.08rem', fontWeight: 500, lineHeight: 1.85, color: '#222', direction: 'rtl', whiteSpace: 'pre-wrap', width: '100%' }}>
                            {/* Show only the first ~30 lines of the contract, with HTML tags removed */}
                            {contract?.split('\n').slice(0, 30).map((line, idx) => {
                              const plainLine = line.replace(/<[^>]+>/g, '');
                              return plainLine.trim() && plainLine.trim() !== '⸻' ? (
                                <div key={idx} style={{ marginBottom: '0.7em', width: '100%' }}>{plainLine}</div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Payment info outside the contract preview card */}
                    <div style={{
                      width: '100%',
                      maxWidth: 600,
                      margin: '0 auto 0 auto',
                      background: '#F3FBF6',
                      color: '#1A4D2C',
                      borderRadius: 18,
                      boxShadow: '0 1px 6px rgba(56,225,142,0.08)',
                      fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif',
                      fontWeight: 400,
                      fontSize: isMobile ? 17 : 19,
                      lineHeight: 1.8,
                      textAlign: 'center',
                      padding: isMobile ? '16px 10px 10px 10px' : '18px 18px 12px 18px',
                      marginBottom: 18,
                      position: 'relative',
                      zIndex: 20,
                    }}>
                      כדי לצפות בכל החוזה – יש להשלים את התשלום.<br />
                      <span style={{ color: '#38E18E', fontWeight: 600, fontSize: isMobile ? 20 : 22 }}>₪49</span>
                      <span style={{ fontWeight: 400, fontSize: isMobile ? 15 : 17 }}> | תשלום חד־פעמי</span>
                    </div>
                    <div className="mb-4 text-center">
                      <PayPalScriptProvider options={{
                        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test',
                        currency: 'ILS',
                        intent: 'capture',
                      }}>
                        <PayPalButtons
                          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
                          forceReRender={[]}
                          createOrder={(data, actions) => {
                            return actions.order.create({
                              intent: 'CAPTURE',
                              purchase_units: [
                                {
                                  amount: {
                                    value: '49.00', // Fixed price of 49 ILS
                                    currency_code: 'ILS',
                                  },
                                  description: 'תשלום עבור חוזה שכירות',
                                },
                              ],
                            });
                          }}
                          onApprove={async (data, actions) => {
                            if (actions.order) {
                              await actions.order.capture();
                              setStep(step + 1); // Move to preview step
                            }
                          }}
                          onError={(err) => {
                            alert('שגיאה בתשלום: ' + err);
                          }}
                        />
                      </PayPalScriptProvider>
                    </div>
                    {isMobile ? (
                      <div className="mobile-sticky-bottom-bar">
                        {step > 0 && (
                          <button
                            className="w-full py-3 rounded-lg font-bold text-lg mt-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                            style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
                            onClick={() => setStep(step - 1)}
                          >
                            הקודם
                          </button>
                        )}
                      </div>
                    ) : (
                      step > 0 && (
                        <button
                          className="w-full py-3 rounded-lg font-bold text-lg mt-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                          style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
                          onClick={() => setStep(step - 1)}
                        >
                          הקודם
                        </button>
                      )
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
                    {/* Contract preview snapshot styled as in contract-preview page, shrunk to 70% size, tags removed, with fade-out */}
                    <div className="contract-container mb-8 flex justify-center items-center" style={{ maxWidth: 900, width: '100%', minHeight: 320, padding: '8px 0', justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
                      <div
                        style={{
                          transform: isMobile ? 'scale(0.7)' : 'scale(0.7)',
                          transformOrigin: 'top center',
                          width: isMobile ? '100vw' : '260mm',
                          height: isMobile ? '260mm' : '190mm',
                          pointerEvents: 'auto',
                          boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
                          borderRadius: 6,
                          overflow: 'hidden',
                          background: '#fff',
                          border: '2px solid var(--contract-border)',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          margin: isMobile ? '0 auto' : undefined,
                        }}
                      >
                        <div className="page" style={{ height: 1000, width: '100%', overflow: 'hidden', position: 'relative', padding: '32px 32px 0 32px', boxShadow: 'none', border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                          <div className="contract-title text-center font-bold text-4xl underline mb-0 mt-2" style={{ fontFamily: 'var(--contract-font)', width: '100%' }}>
                            הסכם שכירות למגורים
                          </div>
                          <div className="contract-subtitle text-center text-lg text-gray-800 mb-3 font-medium" style={{ fontFamily: 'var(--contract-font)', width: '100%' }}>
                            (שכירות בלתי מוגנת)
                          </div>
                          <div className="contract-date-row text-center text-base text-gray-800 mb-3" style={{ fontFamily: 'var(--contract-font)', width: '100%' }}>
                            שנעשה ונחתם ב_______, בתאריך _______.
                          </div>
                          <div className="contract-preview" style={{ fontFamily: 'var(--contract-font)', fontSize: '1.08rem', fontWeight: 500, lineHeight: 1.85, color: '#222', direction: 'rtl', whiteSpace: 'pre-wrap', width: '100%' }}>
                            {/* Show only the first ~30 lines of the contract, with HTML tags removed */}
                            {contract?.split('\n').slice(0, 30).map((line, idx) => {
                              const plainLine = line.replace(/<[^>]+>/g, '');
                              return plainLine.trim() && plainLine.trim() !== '⸻' ? (
                                <div key={idx} style={{ marginBottom: '0.7em', width: '100%' }}>{plainLine}</div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Preview and Download buttons */}
                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-4">
                      <button
                        className="bg-[#38E18E] text-white font-bold px-6 py-3 rounded-lg shadow hover:bg-[#2bc77a] transition-colors text-lg"
                        onClick={() => window.open('/contract-preview', '_blank')}
                      >
                        תצוגה מלאה של ההסכם
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
