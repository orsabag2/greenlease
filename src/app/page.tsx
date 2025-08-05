'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import FormRenderer from '../components/FormRenderer';
import contractMerge, { MergeData } from '../utils/contractMerge';
import { generateSummarySection } from '../utils/contractMerge';
import { Question as QType } from '../utils/visibilityLogic';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import SignInPage from '../components/SignInPage';
import { auth, db } from '../utils/firebase';
import type { User } from 'firebase/auth';
import { collection, addDoc, setDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
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
        ids: ['apartmentRooms', 'apartmentFeatures', 'hasParking', 'parkingNumber', 'hasStorage', 'storageNumber', 'hasGarden', 'gardenMaintenance'],
      },
    ],
  },
  {
    title: 'פרטי השכירות',
    ids: [
      'moveInDate', 'rentEndDate', 'hasExtensionOption', 'extensionDuration', 'extensionNoticeDays', 'extensionRent', 'allowEarlyExit', 'earlyExitCompensationType', 'earlyExitCompensation', 'monthlyRent', 'paymentDay', 'paymentMethod',
      'lateInterestType', 'lateInterestFixedAmount', 'evacuationPenaltyType', 'evacuationPenaltyFixedAmount',
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
          'exitPaintColor',
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
  { label: 'החוזה מוכן', key: 'preview' },
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

// Edit Counter Component
function EditCounter({ editCount, maxEdits }: { editCount: number; maxEdits: number }) {
  const remaining = maxEdits - editCount;
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className="fixed top-0 left-0 w-full z-40 shadow-md" style={{ 
      height: isMobile ? '32px' : '40px',
      background: remaining <= 1 
        ? 'linear-gradient(to right, #f97316, #ea580c)' 
        : 'linear-gradient(to right, #38E18E, #2bc77a)'
    }}>
      <div className="flex items-center justify-center h-full px-4">
        <div className="flex items-center gap-1 text-white">
          <span style={{ fontSize: isMobile ? '12px' : '14px' }}>עריכות שנותרו</span>
          <span style={{ fontSize: isMobile ? '12px' : '14px' }}>{remaining}</span>
          <span style={{ fontSize: isMobile ? '12px' : '14px' }}>מתוך {maxEdits}</span>
          {remaining <= 1 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded mr-2" style={{ fontSize: isMobile ? '10px' : '12px' }}>
              <span>⚠️</span>
              <span>עריכה אחרונה!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [paymentError, setPaymentError] = useState<string | null>(null);
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
  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check if user is coming from dashboard with summary parameter
      const urlParams = new URLSearchParams(window.location.search);
      const summaryParam = urlParams.get('step');
      
      if (summaryParam === 'summary') {
        console.log('Initializing step to summary from URL parameter');
        return 999; // Special value to indicate summary step
      }
      
      // Check if we're editing from dashboard (paid contract)
      const editingFromDashboard = localStorage.getItem('editingFromDashboard') === 'true';
      const contractId = localStorage.getItem('currentContractId');
      
      if (editingFromDashboard && contractId) {
        console.log('Initializing step to summary for paid contract editing');
        return 999; // Special value to indicate summary step
      }
      
      const savedStep = localStorage.getItem('contractStep');
      if (savedStep !== null && !isNaN(Number(savedStep))) {
        const stepNumber = Number(savedStep);
        console.log('Initializing step from localStorage:', stepNumber);
        return stepNumber;
      }
    }
    console.log('Initializing step to 0 (default)');
    return 0;
  });
  const [tenantCount, setTenantCount] = useState<number>(1);
  const [innerStep, setInnerStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedInnerStep = localStorage.getItem('contractInnerStep');
      if (savedInnerStep !== null && !isNaN(Number(savedInnerStep))) {
        const innerStepNumber = Number(savedInnerStep);
        console.log('Initializing innerStep from localStorage:', innerStepNumber);
        return innerStepNumber;
      }
    }
    console.log('Initializing innerStep to 0 (default)');
    return 0;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dataApproved, setDataApproved] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [showUnfinishedModal, setShowUnfinishedModal] = useState(false);
  const [unfinishedContract, setUnfinishedContract] = useState<any>(null);
  const [isEditingFromDashboard, setIsEditingFromDashboard] = useState(false);
  const [wasOnFinalStep, setWasOnFinalStep] = useState(false);
  const [showLockConfirmation, setShowLockConfirmation] = useState(false);
  const [currentEditCount, setCurrentEditCount] = useState(0);
  const [maxEdits, setMaxEdits] = useState(3);
  const [isEditingPaidContract, setIsEditingPaidContract] = useState(() => {
    // Check if we're editing from dashboard and assume it's a paid contract initially
    if (typeof window !== 'undefined') {
      const editingFromDashboard = localStorage.getItem('editingFromDashboard') === 'true';
      const contractId = localStorage.getItem('currentContractId');
      if (editingFromDashboard && contractId) {
        console.log('Initializing isEditingPaidContract to true (editing from dashboard)');
        return true;
      }
    }
    return false;
  });
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Debug modal state changes
  useEffect(() => {
    console.log('Modal state changed:', { 
      showUnfinishedModal, 
      hasUnfinishedContract: !!unfinishedContract,
      user: !!user,
      loadingAuth,
      isEditingFromDashboard
    });
  }, [showUnfinishedModal, unfinishedContract, user, loadingAuth, isEditingFromDashboard]);



  // Check if user was on final step after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('contractStep');
      const savedAnswers = localStorage.getItem('contractMeta');
      const contractId = localStorage.getItem('currentContractId');
      
      if (savedStep !== null && !isNaN(Number(savedStep))) {
        const stepNumber = Number(savedStep);
        
        // If we have a contract ID and step is high, user was likely on final step
        if (contractId && stepNumber >= 6) {
          setWasOnFinalStep(true);
          console.log('User was on final step before refresh (has contract ID)');
        } else if (savedAnswers) {
          try {
            const answers = JSON.parse(savedAnswers);
            // If we have contract data and step is high, user was likely on final step
            if (stepNumber >= 6 && answers && Object.keys(answers).length > 0) {
              setWasOnFinalStep(true);
              console.log('User was on final step before refresh (has contract data)');
            }
          } catch (e) {
            console.error('Error parsing saved answers:', e);
          }
        }
      }
    }
  }, []); // Run only once on mount

  // Clear wasOnFinalStep flag when user starts a new contract or navigates to a different step
  useEffect(() => {
    if (step < 6) {
      setWasOnFinalStep(false);
    }
  }, [step]);

  // Helper function to extract contract details
  const getContractDetails = (contract: any) => {
    const answers = contract.answers || {};
    
    // Extract contract details from answers
    const landlordName = Array.isArray(answers.landlords) && answers.landlords[0] 
      ? answers.landlords[0].landlordName 
      : answers.landlordName;
    
    const tenantName = Array.isArray(answers.tenants) && answers.tenants[0] 
      ? answers.tenants[0].tenantName 
      : answers.tenantName;
    
    const addressParts = [
      answers.street,
      answers.buildingNumber,
      answers.apartmentNumber ? `דירה ${answers.apartmentNumber}` : '',
      answers.propertyCity
    ].filter(Boolean);
    
    const contractAddress = addressParts.join(' ');
    
    return {
      contractAddress,
      landlordName,
      tenantName,
      monthlyRent: answers.monthlyRent,
      moveInDate: answers.moveInDate,
      rentEndDate: answers.rentEndDate,
      updatedAt: contract.updatedAt?.toDate?.() || new Date()
    };
  };

  // Restore step and innerStep when window gains focus or page becomes visible (for navigation back)
  useEffect(() => {
    const restoreProgress = () => {
      const savedStep = localStorage.getItem('contractStep');
      const savedInnerStep = localStorage.getItem('contractInnerStep');
      
      console.log('Main page: Restoring progress on navigation:', { savedStep, savedInnerStep });
      
      if (savedStep !== null && !isNaN(Number(savedStep))) {
        const stepNumber = Number(savedStep);
        setStep(stepNumber);
        console.log('Main page: Restored step to:', stepNumber);
      }
      
      if (savedInnerStep !== null && !isNaN(Number(savedInnerStep))) {
        const innerStepNumber = Number(savedInnerStep);
        setInnerStep(innerStepNumber);
        console.log('Main page: Restored innerStep to:', innerStepNumber);
      }
    };

    // Only restore progress if user is authenticated and no unfinished contract modal is showing
    if (user && !showUnfinishedModal) {
      // Also restore when window gains focus (user navigates back)
      const handleFocus = () => {
        console.log('Main page: Window focused, checking for progress to restore');
        restoreProgress();
      };

      // Also restore when the page becomes visible (user navigates back)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          console.log('Main page: Page became visible, checking for progress to restore');
          restoreProgress();
        }
      };

      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user, showUnfinishedModal]);

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
    const unsubscribe = auth.onAuthStateChanged(async u => {
      setUser(u);
      setLoadingAuth(false);
      
      // Check if user is editing from dashboard
      const editingFromDashboard = localStorage.getItem('editingFromDashboard') === 'true';
      setIsEditingFromDashboard(editingFromDashboard);
      
      // Only check for unfinished contracts on first visit after login
      // Check if we've already shown the modal in this session
      const hasCheckedInSession = sessionStorage.getItem('hasCheckedUnfinishedContract');
      
      // Also check localStorage as a fallback for sessionStorage issues
      const hasCheckedInLocalStorage = localStorage.getItem('hasCheckedUnfinishedContract');
      
      // Check if we've shown the modal recently (within the last hour) to prevent showing on every refresh
      const lastShownTime = sessionStorage.getItem('modalLastShownTime');
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      const hasShownRecently = lastShownTime && (now - parseInt(lastShownTime)) < oneHour;
      
      console.log('Auth state changed - checking modal conditions:', {
        user: !!u,
        editingFromDashboard,
        wasOnFinalStep,
        hasCheckedInSession,
        hasCheckedInLocalStorage,
        hasShownRecently
      });
      
      if (u && !editingFromDashboard && !wasOnFinalStep && !hasCheckedInSession && !hasCheckedInLocalStorage && !hasShownRecently) {
        console.log('Checking for unfinished contracts for user:', u.uid, 'wasOnFinalStep:', wasOnFinalStep);
        try {
          // Query for all contracts for this user to check their status
          const formAnswersQuery = query(
            collection(db, 'formAnswers'),
            where('userId', '==', u.uid)
          );
          const querySnapshot = await getDocs(formAnswersQuery);
          
          console.log('Found contracts:', querySnapshot.docs.length);
          
          if (!querySnapshot.empty) {
            // Filter out contracts that have been paid or completed
            const unfinishedContracts = querySnapshot.docs.filter(doc => {
              const data = doc.data();
              // Exclude contracts that are paid or completed
              return data.status === 'in_progress' && 
                     data.paymentStatus !== 'paid' && 
                     data.status !== 'paid' &&
                     data.status !== 'completed';
            });
            
            if (unfinishedContracts.length > 0) {
              // Get the most recent unfinished contract
              const mostRecentDoc = unfinishedContracts.sort((a, b) => {
                const aTime = a.data().updatedAt?.toDate?.() || new Date(0);
                const bTime = b.data().updatedAt?.toDate?.() || new Date(0);
                return bTime.getTime() - aTime.getTime();
              })[0];
              
              const data = mostRecentDoc.data();
              console.log('Most recent unfinished contract data:', data);
            
              if (data.answers) {
                // Check if there's meaningful data - be more lenient
                const hasData = Object.entries(data.answers).some(([key, value]) => {
                  if (key === 'landlords' || key === 'tenants') {
                    return Array.isArray(value) && value.some(obj => obj && Object.keys(obj).length > 0 && Object.values(obj).some(v => v !== undefined && v !== ''));
                  }
                  // For other fields, check if they have any meaningful value
                  return value !== undefined && value !== '' && value !== null && value !== '{}' && value !== '[]';
                });
                
                console.log('Has meaningful data:', hasData);
                
                if (hasData) {
                  console.log('Setting unfinished contract modal');
                  setUnfinishedContract({ ...data, id: mostRecentDoc.id });
                  setShowUnfinishedModal(true);
                  // Mark that we've checked for unfinished contracts in this session
                  sessionStorage.setItem('hasCheckedUnfinishedContract', 'true');
                  localStorage.setItem('hasCheckedUnfinishedContract', 'true');
                  sessionStorage.setItem('modalLastShownTime', Date.now().toString());
                  console.log('Modal should now be visible, sessionStorage set to:', sessionStorage.getItem('hasCheckedUnfinishedContract'));
                } else {
                  console.log('No meaningful data found in contract');
                  // Mark that we've checked even if no meaningful data
                  sessionStorage.setItem('hasCheckedUnfinishedContract', 'true');
                  localStorage.setItem('hasCheckedUnfinishedContract', 'true');
                  sessionStorage.setItem('modalLastShownTime', Date.now().toString());
                }
              } else {
                console.log('No answers found in contract data');
                // Mark that we've checked even if no answers
                sessionStorage.setItem('hasCheckedUnfinishedContract', 'true');
                localStorage.setItem('hasCheckedUnfinishedContract', 'true');
                sessionStorage.setItem('modalLastShownTime', Date.now().toString());
              }
            } else {
              console.log('No unfinished contracts found');
              // Mark that we've checked even if no unfinished contracts
              sessionStorage.setItem('hasCheckedUnfinishedContract', 'true');
              localStorage.setItem('hasCheckedUnfinishedContract', 'true');
              sessionStorage.setItem('modalLastShownTime', Date.now().toString());
            }
          } else {
            console.log('No contracts found');
            // Mark that we've checked even if no contracts
            sessionStorage.setItem('hasCheckedUnfinishedContract', 'true');
            localStorage.setItem('hasCheckedUnfinishedContract', 'true');
            sessionStorage.setItem('modalLastShownTime', Date.now().toString());
          }
        } catch (error) {
          console.error('Error checking for unfinished contract:', error);
          // Mark that we've checked even if there was an error
          sessionStorage.setItem('hasCheckedUnfinishedContract', 'true');
          localStorage.setItem('hasCheckedUnfinishedContract', 'true');
          sessionStorage.setItem('modalLastShownTime', Date.now().toString());
        }
      } else if (u && editingFromDashboard) {
        console.log('User is editing from dashboard - skipping modal check');
        // Clear the flag after using it
        localStorage.removeItem('editingFromDashboard');
      } else if (u && wasOnFinalStep) {
        console.log('User was on final step - skipping modal check');
      } else if (u && hasCheckedInSession) {
        console.log('Already checked for unfinished contracts in this session');
      }
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

  // Debug rendering state
  useEffect(() => {
    console.log('Rendering state:', { 
      user: !!user, 
      loadingAuth, 
      step, 
      groupedLength: grouped.length,
      isLoading,
      isEditingPaidContract
    });
  }, [user, loadingAuth, step, grouped.length, isLoading, isEditingPaidContract]);

  // Debug isEditingPaidContract changes
  useEffect(() => {
    console.log('isEditingPaidContract changed:', isEditingPaidContract);
  }, [isEditingPaidContract]);

  // Check if we're editing from dashboard (which means it's a paid contract)
  const editingFromDashboard = typeof window !== 'undefined' && localStorage.getItem('editingFromDashboard') === 'true';
  const shouldHidePaymentSteps = isEditingPaidContract || editingFromDashboard;

  // Handle special summary step value
  useEffect(() => {
    console.log('Summary step handling - step:', step, 'grouped.length:', grouped.length);
    if (step === 999) {
      if (grouped.length > 0) {
        console.log('Converting step 999 to summary step:', grouped.length);
        setStep(grouped.length); // Set to actual summary step
        setIsLoading(false); // Clear loading state
        // Clear the URL parameter
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('step');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        // Questions are still loading, keep the loading state
        console.log('Questions still loading, keeping loading state');
        setIsLoading(true);
      }
    }
  }, [step, grouped.length]);

  // Handle transition when questions are loaded and user is waiting for summary step
  useEffect(() => {
    console.log('Questions loaded effect - step:', step, 'grouped.length:', grouped.length, 'questions.length:', questions.length);
    if (step === 999 && grouped.length > 0) {
      console.log('Converting step 999 to summary step:', grouped.length);
      setStep(grouped.length); // Set to actual summary step
      setIsLoading(false); // Clear loading state
      // Clear the URL parameter
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('step');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [questions, grouped.length, step]);

  // Force landing on summary step when editing paid contract
  useEffect(() => {
    if (shouldHidePaymentSteps && grouped.length > 0 && step !== grouped.length && step !== 999 && !isEditingStep) {
      console.log('Forcing landing on summary step for paid contract editing - current step:', step, 'summary step:', grouped.length);
      setStep(grouped.length); // Force to summary step
      // Update localStorage to reflect the summary step
      localStorage.setItem('contractStep', grouped.length.toString());
    }
  }, [shouldHidePaymentSteps, grouped.length, step, isEditingStep]);

  // Stepper UI
  function Stepper({ currentStep = 0, showSignInModal = false }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
      setMounted(true);
    }, []);
    
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.mobile-menu-container') && !target.closest('.avatar-dropdown-container')) {
          setMobileMenuOpen(false);
          setAvatarDropdownOpen(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen, avatarDropdownOpen]);
    
    const handleStepClick = (stepIndex: number) => {
      if (stepIndex <= step) {
        setStep(stepIndex);
        setMobileMenuOpen(false);
      }
    };
    // Figma colors
    const green = '#38E18E';
    const darkGreen = '#281D57';
    const gray = '#D1D5DB';
    const textGray = '#7A8B99';
    const activeText = darkGreen;


    
    const allSteps = [
      ...GROUPS.map(g => ({ label: g.title, key: g.title })),
      { label: 'סיכום', key: 'summary' },
      // Only include payment and preview steps if NOT editing a paid contract
      ...(shouldHidePaymentSteps ? [] : [
        { label: 'תשלום', key: 'payment' },
        { label: 'החוזה מוכן', key: 'preview' }
      ]),
    ];

    console.log('Stepper - isEditingPaidContract:', isEditingPaidContract, 'editingFromDashboard:', editingFromDashboard, 'shouldHidePaymentSteps:', shouldHidePaymentSteps, 'allSteps:', allSteps);

    const steps = allSteps;

    // Helper functions to calculate step indices
    const getSummaryStepIndex = () => grouped.length;
    const getPaymentStepIndex = () => shouldHidePaymentSteps ? -1 : grouped.length + 1; // -1 means payment step doesn't exist
    const getPreviewStepIndex = () => shouldHidePaymentSteps ? -1 : grouped.length + 2; // -1 means preview step doesn't exist for paid contracts

    // Show loading state or prevent hydration mismatch by not rendering until mounted
    if (!mounted || isLoading) {
      return (
        <div className="fixed top-0 left-0 w-full z-30 flex justify-center items-center py-2 px-4 bg-white" style={{ borderBottom: '1.5px solid #E0E7EF', borderRadius: '0 0 18px 18px', minHeight: '48px', top: isEditingPaidContract ? '32px' : '0px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            flexShrink: 0 
          }}>
            <img src="/logo.svg" alt="GreenLease" style={{ width: '120px', height: '24px' }} />
          </div>
        </div>
      );
    }

    // Mobile: show logo and hamburger menu when sign-in modal is active
    if (isMobile && showSignInModal) {
      return (
        <div className="fixed top-0 left-0 w-full z-30 flex justify-center items-center py-2 px-4 bg-white" style={{ borderBottom: '1.5px solid #E0E7EF', borderRadius: '0 0 18px 18px', minHeight: '48px', top: isEditingPaidContract ? '32px' : '0px' }}>
          {/* Logo for mobile */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            flexShrink: 0 
          }}>
            <img src="/logo.svg" alt="GreenLease" style={{ width: '120px', height: '24px' }} />
          </div>
        </div>
      );
    }

    // Show only logo when sign-in modal is active (desktop)
    if (showSignInModal) {
      return (
        <div className="fixed top-0 left-0 w-full z-30 flex justify-center items-center pt-5 px-2 bg-white" style={{ borderBottom: '1.5px solid #E0E7EF', borderRadius: '0 0 18px 18px', minHeight: '48px', paddingBottom: 16, top: isEditingPaidContract ? '40px' : '0px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexShrink: 0 
          }}>
            <img src="/logo.svg" alt="GreenLease" style={{ width: '200px', height: '32px' }} />
          </div>
        </div>
      );
    }

    // Mobile: show circle on left, logo in center, avatar on right
    if (isMobile) {
      // Calculate progress
      const totalSteps = steps.length;
      const completedSteps = currentStep + 1; // Add 1 to include the current step as completed
      const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      
      return (
        <>
          <div className="fixed top-0 left-0 w-full z-30 bg-white" style={{ borderBottom: '1.5px solid #E0E7EF', borderRadius: '0 0 18px 18px', height: '48px', width: '100vw', left: 0, right: 0, margin: 0, top: isEditingPaidContract ? '32px' : '0px' }}>
            <div className="flex flex-row justify-between items-center px-4 py-1 h-full w-full" style={{ width: '100%', margin: 0, padding: '0 16px', maxWidth: '100vw' }}>
              {/* Circular progress - LEFT */}
              <div 
                className="cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setAvatarDropdownOpen(false); // Close avatar dropdown when opening progress menu
                }}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '32px',
                  height: '32px',
                  paddingBottom: '2px'
                }}
              >
                {mobileMenuOpen ? (
                  // X icon when menu is open
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="#38E18E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : (
                  // Progress circle when menu is closed
                  <div className="relative w-8 h-8">
                    {/* Background circle */}
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        stroke="#E0E7EF"
                        strokeWidth="2"
                        fill="none"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        stroke="#38E18E"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 14}`}
                        strokeDashoffset={`${2 * Math.PI * 14 * (1 - progressPercentage / 100)}`}
                        className="transition-all duration-300 ease-out"
                      />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span 
                        className="text-xs font-bold leading-none"
                        style={{ 
                          color: '#281d57', 
                          fontFamily: 'Noto Sans Hebrew',
                          fontSize: '1.5px',
                          lineHeight: '1',
                          transform: 'translateY(0.5px)'
                        }}
                      >
                        {completedSteps}/{totalSteps}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Logo - CENTER */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: 'auto',
                minWidth: 'fit-content',
                backgroundColor: 'transparent',
                zIndex: 1
              }}>
                <img 
                  src="/logo.svg" 
                  alt="GreenLease" 
                  style={{ 
                    width: '100px', 
                    height: '20px',
                    display: 'block',
                    maxWidth: '100px',
                    maxHeight: '20px'
                  }} 
                />
              </div>
              
              {/* Avatar - RIGHT */}
              {user && (
                <div className="relative avatar-dropdown-container" style={{ position: 'relative' }}>
                  <div 
                    className="cursor-pointer"
                    onClick={() => {
                      setAvatarDropdownOpen(!avatarDropdownOpen);
                      setMobileMenuOpen(false); // Close progress menu when opening avatar dropdown
                    }}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      width: '32px',
                      height: '32px'
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || user.email || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#38E18E] flex items-center justify-center text-white text-xs font-bold">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Avatar Dropdown Menu */}
                  {avatarDropdownOpen && (
                    <div className="fixed top-12 right-4 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50" style={{ top: isEditingPaidContract ? '80px' : '48px' }}>
                      <Link
                        href="/dashboard"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setAvatarDropdownOpen(false)}
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        החוזים שלי
                      </Link>
                      <button
                        onClick={() => {
                          auth.signOut();
                          setAvatarDropdownOpen(false);
                          // Clear session flag when signing out so modal can show again if user signs back in
                          sessionStorage.removeItem('hasCheckedUnfinishedContract');
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        התנתק
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile menu overlay - Below header */}
          {mobileMenuOpen && (
            <div className="fixed top-12 left-0 w-full h-full bg-white shadow-lg border-t border-gray-200 z-45" style={{ top: isEditingPaidContract ? '80px' : '48px' }}>
              <div className="p-4 pl-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Noto Sans Hebrew' }}>
                    התקדמות
                  </div>
                  <div className="text-sm font-bold" style={{ color: '#281d57', fontFamily: 'Noto Sans Hebrew' }}>
                    {completedSteps}/{totalSteps}
                  </div>
                </div>
                <div 
                  className="w-full bg-gray-200 rounded-full h-2 mb-4"
                  style={{ backgroundColor: '#E0E7EF' }}
                >
                  <div 
                    className="h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${progressPercentage}%`,
                      backgroundColor: '#38E18E'
                    }}
                  />
                </div>
                <div className="space-y-3">
                  {Array.isArray(steps) && steps.length > 0 ? steps.map((s, i) => (
                    <div
                      key={s.key}
                      className={`flex items-center p-2 rounded-lg transition-colors ${
                        i <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                      } ${
                        i === currentStep ? 'bg-green-100 border border-green-300' : 
                        i < currentStep ? 'bg-gray-50' : 'bg-white'
                      }`}
                      onClick={() => handleStepClick(i)}
                    >
                      <div
                        className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs relative"
                        style={{
                          border: `2px solid ${i < currentStep ? green : i === currentStep ? green : gray}`,
                          background: i < currentStep ? green : i === currentStep ? green : '#ffffff',
                          color: i < currentStep ? '#ffffff' : i === currentStep ? green : gray,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '8px'
                        }}
                      >
                        {i < currentStep ? (
                          <svg width="12" height="12" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                            <path d="M5 9.5L8 12.5L13 7.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : i === currentStep ? (
                          <div
                            style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              backgroundColor: '#ffffff',
                              display: 'block'
                            }}
                          />
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          i === currentStep ? 'text-green-700' : 
                          i < currentStep ? 'text-gray-600' : 'text-gray-300'
                        }`}
                        style={{ fontFamily: 'Noto Sans Hebrew' }}
                      >
                        {s.label}
                      </span>
                    </div>
                  )) : null}
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    // Desktop: show full stepper
    return (
      <div className="fixed top-0 left-0 w-full z-30 flex justify-center items-center pt-5 px-2 bg-white" style={{ borderBottom: '1.5px solid #E0E7EF', borderRadius: '0 0 18px 18px', minHeight: '48px', paddingBottom: 0, top: isEditingPaidContract ? '40px' : '0px' }}>
        {/* Logo - positioned absolutely to top right of entire screen */}
        <div style={{ 
          position: 'absolute', 
          top: '24px', 
          right: '16px', 
          zIndex: 10,
          display: 'flex', 
          alignItems: 'center', 
          flexShrink: 0 
        }}>
          <img src="/logo.svg" alt="GreenLease" style={{ width: '200px', height: '32px' }} />
        </div>

        {/* Avatar Dropdown - positioned absolutely to top left of entire screen */}
        {user && (
          <div style={{ 
            position: 'absolute', 
            top: '16px', 
            left: '16px', 
            zIndex: 20
          }}>
            <div className="relative avatar-dropdown-container">
              <button
                onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-gray-300 transition-colors bg-white shadow-sm"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || user.email || 'User'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#38E18E] flex items-center justify-center text-white text-sm font-bold">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </button>
              
              {/* Dropdown Menu */}
              {avatarDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-30" style={{ top: 'calc(100% + 8px)' }}>
                  <Link
                    href="/dashboard"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setAvatarDropdownOpen(false)}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    החוזים שלי
                  </Link>
                                     <button
                                             onClick={() => {
                    auth.signOut();
                    setAvatarDropdownOpen(false);
                    // Clear session flag when signing out so modal can show again if user signs back in
                    sessionStorage.removeItem('hasCheckedUnfinishedContract');
                    localStorage.removeItem('hasCheckedUnfinishedContract');
                    sessionStorage.removeItem('modalLastShownTime');
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  התנתק
                </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="relative w-full overflow-x-auto scrollbar-hide" style={{ direction: 'ltr', maxWidth: 900 }}>
          {/* Steps - centered */}
          <div className="flex justify-center items-start overflow-x-auto scrollbar-hide gap-0" style={{ direction: 'rtl', width: '100%' }}>
          {Array.isArray(steps) && steps.length > 0 ? steps.map((s, i) => (
            <div
              key={s.key}
              className={`flex flex-col items-center min-w-[40px] mx-1 ${
                i <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
              style={{ justifyContent: 'flex-start', alignItems: 'center', height: 70 }}
              onClick={() => handleStepClick(i)}
            >
              <div
                className="flex items-center justify-center transition-all duration-200 font-bold select-none"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${i < currentStep ? green : i === currentStep ? green : gray}`,
                  background: i < currentStep ? green : i === currentStep ? green : '#ffffff',
                  color: i < currentStep ? '#ffffff' : i === currentStep ? green : gray,
                  fontSize: '12px',
                  position: 'relative',
                  transition: 'background 0.2s, border 0.2s',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  marginBottom: '4px',
                }}
              >
                {i < currentStep ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                    <path d="M5 9.5L8 12.5L13 7.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i === currentStep ? (
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      display: 'block'
                    }}
                  />
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {i + 1}
                  </span>
                )}
              </div>
              <div
                className="text-xs text-center transition-all duration-200 font-medium"
                title={s.label}
                style={{
                  color: i <= currentStep ? (i === currentStep ? activeText : textGray) : '#D1D5DB',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  maxWidth: '50px',
                  minHeight: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  fontWeight: i === currentStep ? 700 : 500,
                  fontSize: '12px',
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
    // On step change, scroll to top to ensure user doesn't miss questions
    useEffect(() => { 
      if (typeof window !== 'undefined') {
        console.log('Step changed to:', step, 'scrolling to top');
        // Add a small delay to ensure the step change is fully processed
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
      
      // Reset editing flag when returning to summary step
      if (step === grouped.length) {
        console.log('Returned to summary step, resetting isEditingStep flag');
        setIsEditingStep(false);
      }
    }, [step, grouped.length]);

    useEffect(() => {
      const checkMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 600);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Check immediately if we're editing a paid contract from localStorage
      useEffect(() => {
    const contractId = localStorage.getItem('currentContractId');
    const editingFromDashboard = localStorage.getItem('editingFromDashboard');
    
    console.log('Checking paid contract - contractId:', contractId, 'editingFromDashboard:', editingFromDashboard);
    
    if (contractId && editingFromDashboard === 'true') {
      // Immediately check if this is a paid contract
      const checkPaidContract = async () => {
        try {
          const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
          const contractData = contractDoc.data();
          
          console.log('Contract data:', contractData);
          
          if (contractData?.status === 'paid') {
            console.log('Setting isEditingPaidContract to true');
            setCurrentEditCount(contractData.editCount || 0);
            setMaxEdits(contractData.maxEdits || 3);
            setIsEditingPaidContract(true);
          } else {
            console.log('Contract is not paid, setting isEditingPaidContract to false');
            setIsEditingPaidContract(false);
          }
        } catch (error) {
          console.error('Error checking paid contract status:', error);
          // If there's an error, assume it's a paid contract when editing from dashboard
          console.log('Error occurred, assuming paid contract for dashboard editing');
          setIsEditingPaidContract(true);
        }
      };
      
      checkPaidContract();
    } else {
      console.log('Not editing from dashboard or no contract ID');
    }
  }, []);

    // Load edit tracking data when user is available
    useEffect(() => {
      if (!user) return;
      
      const loadEditTrackingData = async () => {
        const contractId = localStorage.getItem('currentContractId');
        if (contractId) {
          try {
            const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
            const contractData = contractDoc.data();
            
            if (contractData?.status === 'paid') {
              setCurrentEditCount(contractData.editCount || 0);
              setMaxEdits(contractData.maxEdits || 3);
              setIsEditingPaidContract(true);
            } else {
              setIsEditingPaidContract(false);
            }
          } catch (error) {
            console.error('Error loading edit tracking data:', error);
            // If there's an error, assume it's a paid contract when editing from dashboard
            const editingFromDashboard = localStorage.getItem('editingFromDashboard') === 'true';
            if (editingFromDashboard) {
              console.log('Error occurred, assuming paid contract for dashboard editing');
              setIsEditingPaidContract(true);
            }
          }
        } else {
          setIsEditingPaidContract(false);
        }
      };
      
      loadEditTrackingData();
      
      // Clear loading state when user data is loaded
      setIsLoading(false);
    }, [user]);

    // Add a new effect to update Firestore on every answers change (if user is logged in)
    useEffect(() => {
      if (!user) return;
      
      // Don't create new contracts if user was on final step (prevents creating in_progress after payment)
      if (wasOnFinalStep) return;
      
      // Save immediately when user starts filling any field
      const saveAnswersToFirestore = async () => {
        try {
          // Check if we have a contract ID in localStorage
          let contractId = localStorage.getItem('currentContractId');
          
          if (!contractId) {
            // Create a new contract document
            const newContractRef = await addDoc(collection(db, 'formAnswers'), {
              userId: user.uid,
              answers,
              step,
              innerStep,
              updatedAt: new Date(),
              status: 'in_progress',
            });
            contractId = newContractRef.id;
            localStorage.setItem('currentContractId', contractId);
          } else {
            // Check if this is an edit of a paid contract
            const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
            const contractData = contractDoc.data();
            
            if (contractData?.status === 'paid') {
              const currentEditCount = contractData.editCount || 0;
              const maxEdits = contractData.maxEdits || 3;
              
              if (currentEditCount >= maxEdits) {
                // Contract is locked
                alert('לא ניתן לערוך חוזה זה יותר. החוזה נעול.');
                return;
              }
              
              // Update edit tracking state (but don't increment count yet)
              setCurrentEditCount(currentEditCount);
              setMaxEdits(maxEdits);
              setIsEditingPaidContract(true);
              
              // Save answers without incrementing edit count
              await setDoc(doc(db, 'formAnswers', contractId), {
                userId: user.uid,
                answers,
                step,
                innerStep,
                updatedAt: new Date(),
                // Don't increment editCount here - only save the answers
              }, { merge: true });
            } else {
              // Regular save for unpaid contracts
              await setDoc(doc(db, 'formAnswers', contractId), {
                userId: user.uid,
                answers,
                step,
                innerStep,
                updatedAt: new Date(),
                status: 'in_progress',
              }, { merge: true });
            }
          }
        } catch (error) {
          console.error('Error saving answers to Firestore:', error);
        }
      };
      
      // Save on any change, even if minimal data
      saveAnswersToFirestore();
    }, [user, answers, wasOnFinalStep]);

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
        {showSignInModal && <SignInPage />}
        
        {/* Edit Counter for Paid Contracts */}
        {user && isEditingPaidContract && (
          <EditCounter editCount={currentEditCount} maxEdits={maxEdits} />
        )}
        
        {/* Lock Confirmation Modal */}
        {showLockConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
              <div className="text-2xl mb-4">🔒</div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">החוזה יינעל</h3>
              <p className="text-gray-600 mb-4">
                זו תהיה העריכה האחרונה שלך. לאחר שמירה, לא תוכל לערוך את החוזה יותר.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLockConfirmation(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded"
                >
                  ביטול
                </button>
                <button
                  onClick={async () => {
                    setShowLockConfirmation(false);
                    
                    // Save and lock the contract
                    const contractId = localStorage.getItem('currentContractId');
                    if (contractId && user) {
                      try {
                        await setDoc(doc(db, 'formAnswers', contractId), {
                          userId: user.uid,
                          answers,
                          step,
                          innerStep,
                          updatedAt: new Date(),
                          editCount: currentEditCount + 1,
                          lastEditDate: new Date(),
                          isLocked: true
                        }, { merge: true });
                        
                        // Update local state
                        setCurrentEditCount(currentEditCount + 1);
                        setIsEditingPaidContract(false);
                        
                        alert('החוזה נשמר ונעול. לא תוכל לערוך אותו יותר.');
                        
                        // Navigate to contract preview to see the updated contract
                        router.push('/contract-preview');
                      } catch (error) {
                        console.error('Error saving and locking contract:', error);
                        alert('שגיאה בשמירת החוזה. אנא נסה שוב.');
                      }
                    }
                  }}
                  className="flex-1 bg-[#38E18E] text-[#281D57] px-4 py-2 rounded font-bold"
                >
                  שמור ונעל
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Unfinished Contract Modal */}
        {showUnfinishedModal && unfinishedContract && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
          }}>
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              padding: 32, 
              maxWidth: 500, 
              width: '90%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
              fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
              textAlign: 'center'
            }}>
              <div className="mb-6">
                <div className="flex justify-center mb-4">
                  <img 
                    src="/question-icons/continue-edit.png" 
                    alt="Continue Edit" 
                    style={{ height: '160px', width: 'auto' }}
                  />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">יש לך חוזה שלא הושלם</h2>
                <p className="text-gray-600 mb-4">
                  מצאנו חוזה שהתחלת לעבוד עליו. האם תרצה להמשיך איתו או ליצור חוזה חדש?
                </p>
                
                {/* Contract Card */}
                {(() => {
                  const details = getContractDetails(unfinishedContract);
                  return (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {details.contractAddress || 'כתובת לא זמינה'}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                          בתהליך
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        {details.landlordName && (
                          <div className="flex justify-between">
                            <span className="font-medium">משכיר:</span>
                            <span>{details.landlordName}</span>
                          </div>
                        )}
                        {details.tenantName && (
                          <div className="flex justify-between">
                            <span className="font-medium">שוכר:</span>
                            <span>{details.tenantName}</span>
                          </div>
                        )}
                        {details.monthlyRent && (
                          <div className="flex justify-between">
                            <span className="font-medium">דמי שכירות:</span>
                            <span>{details.monthlyRent} ₪</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="font-medium">תאריך יצירה:</span>
                          <span>{details.updatedAt.toLocaleDateString('he-IL')}</span>
                        </div>
                        {details.moveInDate && (
                          <div className="flex justify-between">
                            <span className="font-medium">תאריך כניסה:</span>
                            <span>{details.moveInDate}</span>
                          </div>
                        )}
                        {details.rentEndDate && (
                          <div className="flex justify-between">
                            <span className="font-medium">תאריך סיום:</span>
                            <span>{details.rentEndDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    console.log('Modal: Continuing with unfinished contract:', unfinishedContract);
                    
                    // Load the unfinished contract data
                    setAnswers(unfinishedContract.answers);
                    
                    // Set the contract ID to continue editing the same contract
                    if (unfinishedContract.id) {
                      localStorage.setItem('currentContractId', unfinishedContract.id);
                    }
                    
                    // Save contract meta to localStorage for consistency
                    localStorage.setItem('contractMeta', JSON.stringify(unfinishedContract.answers));
                    
                    // Restore step and innerStep from the contract data
                    let targetStep = 0;
                    let targetInnerStep = 0;
                    
                    if (unfinishedContract.step !== undefined && unfinishedContract.step !== null) {
                      targetStep = unfinishedContract.step;
                      console.log('Modal: Using saved step:', targetStep);
                    } else {
                      // Calculate the last step with data
                      const answers = unfinishedContract.answers || {};
                      if (answers.landlords && answers.landlords.length > 0 && answers.landlords[0].landlordName) {
                        targetStep = Math.max(targetStep, 0);
                      }
                      if (answers.tenants && answers.tenants.length > 0 && answers.tenants[0].tenantName) {
                        targetStep = Math.max(targetStep, 1);
                      }
                      if (answers.propertyCity || answers.street) {
                        targetStep = Math.max(targetStep, 2);
                      }
                      if (answers.monthlyRent || answers.moveInDate) {
                        targetStep = Math.max(targetStep, 3);
                      }
                      if (answers.allowPets !== undefined || answers.allowSublet !== undefined) {
                        targetStep = Math.max(targetStep, 4);
                      }
                      if (answers.security_types || answers.guaranteeAmount) {
                        targetStep = Math.max(targetStep, 5);
                      }
                      console.log('Modal: Calculated step from data:', targetStep);
                    }
                    
                    if (unfinishedContract.innerStep !== undefined && unfinishedContract.innerStep !== null) {
                      targetInnerStep = unfinishedContract.innerStep;
                    }
                    
                    // Set the steps in localStorage first
                    localStorage.setItem('contractStep', targetStep.toString());
                    localStorage.setItem('contractInnerStep', targetInnerStep.toString());
                    
                    // Then update the state
                    setStep(targetStep);
                    setInnerStep(targetInnerStep);
                    
                    console.log('Modal: Final step restoration - step:', targetStep, 'innerStep:', targetInnerStep);
                    
                    setShowUnfinishedModal(false);
                    // Clear the session flag since user made a choice
                    sessionStorage.removeItem('hasCheckedUnfinishedContract');
                    localStorage.removeItem('hasCheckedUnfinishedContract');
                    sessionStorage.removeItem('modalLastShownTime');
                  }}
                  className="w-full bg-[#38E18E] text-[#281D57] font-bold px-6 py-3 rounded-lg shadow hover:bg-[#2bc77a] transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  המשך עם החוזה הקיים
                </button>
                
                <button
                  onClick={() => {
                    console.log('Modal: Creating new contract - clearing all data');
                    
                    // Clear all localStorage items first
                    localStorage.removeItem('contractMeta');
                    localStorage.removeItem('contractStep');
                    localStorage.removeItem('contractInnerStep');
                    localStorage.removeItem('currentContractId');
                    localStorage.removeItem('editingFromDashboard');
                    
                    // Clear state
                    setAnswers({
                      landlords: [{}],
                      tenants: [{}],
                    });
                    setStep(0);
                    setInnerStep(0);
                    setWasOnFinalStep(false);
                    
                    setShowUnfinishedModal(false);
                    
                    // Clear the session flag since user made a choice
                    sessionStorage.removeItem('hasCheckedUnfinishedContract');
                    localStorage.removeItem('hasCheckedUnfinishedContract');
                    sessionStorage.removeItem('modalLastShownTime');
                    
                    console.log('Modal: New contract creation - all data cleared');
                  }}
                  className="w-full bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-lg shadow hover:bg-gray-300 transition-colors"
                >
                  צור חוזה חדש
                </button>
              </div>
            </div>
          </div>
        )}
                        <main className="flex flex-col items-center min-h-screen" style={{ 
                          paddingTop: isEditingPaidContract ? (isMobile ? 112 : 140) : (isMobile ? 80 : 100), 
                          paddingBottom: isMobile ? 4 : 0,
                          background: isMobile ? '#fff' : '#F8F8FC',
                          minHeight: isMobile ? 'calc(100vh - 84px)' : '100vh',
                          overflowY: 'auto'
                        }} dir="rtl">
                          {isLoading && (
                            <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38E18E] mx-auto"></div>
                                <p className="mt-4 text-gray-600" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                                  טוען...
                                </p>
                              </div>
                            </div>
                          )}
          <Stepper currentStep={step} showSignInModal={showSignInModal} />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className={isMobile ? 'w-full bg-white rounded-none flex flex-col items-center mt-8 motion-div mobile-content-container mobile-step-content' : 'w-full max-w-xl bg-white rounded-xl shadow-lg p-8 flex flex-col items-center mt-8'}
              style={isMobile ? { 
                alignItems: 'stretch', 
                boxShadow: 'none', 
                borderRadius: 0,
                padding: '0 0 4px 0',
                paddingLeft: '0',
                paddingRight: '0',
                paddingBottom: '4px',
                minHeight: 'calc(100vh - 84px)',
                overflowY: 'visible'
              } : { alignItems: 'stretch' }}
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
                            style={{ height: 160, width: 'auto', marginBottom: 8 }}
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
                          color: '#281D57',
                          marginTop: 0,
                          marginLeft: 0,
                          marginRight: 0,
                          marginBottom: 8,
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
                          color: '#281D57',
                          alignSelf: 'center',
                          flexGrow: 0,
                          marginLeft: 'auto',
                          marginRight: 'auto',
                          marginBottom: 8,
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
                          color: '#281D57',
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
                          color: '#281D57',
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
                        mobileMenuOpen={mobileMenuOpen}
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
                        mobileMenuOpen={mobileMenuOpen}
                      />
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
                        style={{ height: 160, width: 'auto', marginBottom: 8 }}
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
                          color: '#281D57',
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
                          color: '#281D57',
                        }}
                      >
                        רגע לפני שממשיכים, הנה כל מה שמילאת עד עכשיו. אפשר לערוך כל חלק בנפרד.
                      </div>
                    </div>
                    <div className={`${isMobile ? 'w-full' : 'max-w-2xl'} w-full flex flex-col gap-6 mb-8`} dir="rtl" style={isMobile ? { width: '100%', maxWidth: '100%', padding: '0 16px' } : {}}>
                      {grouped.flatMap((group, groupIdx) => {
                        if (group.title === 'פרטי השוכר' && Array.isArray(answers.tenants)) {
                          return answers.tenants.map((tenant, tenantIdx) => (
                            <div key={group.title + tenantIdx} className="bg-white border border-[#38E18E] rounded-2xl shadow p-6 text-right summary-green-card" dir="rtl" style={isMobile ? { width: '100%', maxWidth: '100%', boxSizing: 'border-box' } : {}}>
                              <div className="font-bold text-lg mb-3 text-right" style={{ color: '#281D57', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{group.title + ' ' + (tenantIdx + 1)}</div>
                              <div className="flex flex-col gap-6 text-right" dir="rtl">
                                {group.questions.map(q => {
                                  if (!q) return null;
                                  // Use tenant-specific answers for visibility and value
                                  const isVisible = require('../utils/visibilityLogic').isQuestionVisible(q, tenant);
                                  if (!isVisible) return null;
                                  let value = tenant[q.id];
                                  if (Array.isArray(value)) value = value.join(', ');
                                  const displayValue = (value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (typeof value === 'object' && Object.keys(value).length === 0)) ? 'לא צוין' : String(value);
                                  return (
                                    <div key={q.id} className="flex flex-col items-end mb-2 text-right" dir="rtl">
                                      <span className="text-sm font-medium text-[#281D57] text-right" style={{ fontFamily: 'Noto Sans Hebrew', textAlign: 'right' }}>{q.label}</span>
                                      <span className="text-base font-bold text-[#281D57] mt-1 text-right" style={{ fontFamily: 'Noto Sans Hebrew', textAlign: 'right' }}>{displayValue}</span>
                                    </div>
                                  );
                                }).filter(x => x != null)}
                              </div>
                              <div className="flex justify-end mt-2">
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 underline font-bold hover:text-blue-800 transition-colors"
                                  onClick={() => {
                                    console.log('Edit button clicked for tenant group:', groupIdx);
                                    setIsEditingStep(true);
                                    setStep(groupIdx);
                                  }}
                                >
                                  ערוך
                                </button>
                              </div>
                            </div>
                          )).filter(Boolean);
                        } else {
                          if (!group) return [];
                          const node = (
                            <div key={group.title} className="bg-white border border-[#38E18E] rounded-2xl shadow p-6 text-right summary-green-card" dir="rtl" style={isMobile ? { width: '100%', maxWidth: '100%', boxSizing: 'border-box' } : {}}>
                              <div className="font-bold text-lg mb-3 text-right" style={{ color: '#281D57', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}>{group.title}</div>
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
                                  const displayValue = (value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (typeof value === 'object' && Object.keys(value).length === 0)) ? 'לא צוין' : String(value);
                                  return (
                                    <div key={q.id} className="flex flex-col items-end mb-2 text-right" dir="rtl">
                                      <span className="text-sm font-medium text-[#281D57] text-right" style={{ fontFamily: 'Noto Sans Hebrew', textAlign: 'right' }}>{q.label}</span>
                                      <span className="text-base font-bold text-[#281D57] mt-1 text-right" style={{ fontFamily: 'Noto Sans Hebrew', textAlign: 'right' }}>{displayValue}</span>
                                    </div>
                                  );
                                }).filter(x => x != null)}
                              </div>
                              <div className="flex justify-end mt-2">
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 underline font-bold hover:text-blue-800 transition-colors"
                                  onClick={() => {
                                    console.log('Edit button clicked for group:', groupIdx);
                                    setIsEditingStep(true);
                                    setStep(groupIdx);
                                  }}
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
                    {/* Data approval checkbox */}
                    <div className="w-full max-w-2xl mb-4 flex items-start gap-3 p-4 bg-gray-50 rounded-lg" dir="rtl">
                      <input
                        type="checkbox"
                        id="dataApproval"
                        checked={dataApproved}
                        onChange={(e) => setDataApproved(e.target.checked)}
                        className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        style={{ accentColor: '#38E18E' }}
                      />
                      <label 
                        htmlFor="dataApproval" 
                        className="text-sm text-gray-700 cursor-pointer"
                        style={{ fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
                      >
                        אני מאשר/ת שכל הנתונים שהוזנו נכונים ומדויקים
                      </label>
                    </div>
                    
                    <button
                      type="button"
                      className="w-full max-w-2xl py-3 rounded-lg font-bold text-lg transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: '#38E18E', color: '#281D57', fontFamily: 'Noto Sans Hebrew, Rubik, Arial, sans-serif' }}
                      onClick={async () => {
                        if (isEditingPaidContract) {
                          // Set loading state
                          setIsLoading(true);
                          
                          // Save changes and count as edit
                          const contractId = localStorage.getItem('currentContractId');
                          if (contractId && user) {
                            try {
                              const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
                              const contractData = contractDoc.data();
                              const currentEditCount = contractData?.editCount || 0;
                              const maxEdits = contractData?.maxEdits || 3;
                              
                              if (currentEditCount >= maxEdits) {
                                alert('לא ניתן לערוך חוזה זה יותר. החוזה נעול.');
                                return;
                              }
                              
                              // Check if this will be the final edit
                              if (currentEditCount + 1 >= maxEdits) {
                                setShowLockConfirmation(true);
                                return;
                              }
                              
                              // Save the changes and increment edit count
                              await setDoc(doc(db, 'formAnswers', contractId), {
                                userId: user.uid,
                                answers,
                                step,
                                innerStep,
                                updatedAt: new Date(),
                                editCount: currentEditCount + 1,
                                lastEditDate: new Date(),
                                isLocked: currentEditCount + 1 >= maxEdits
                              }, { merge: true });
                              
                              // Update local state
                              setCurrentEditCount(currentEditCount + 1);
                              
                              // Show success message
                              alert('השינויים נשמרו בהצלחה!');
                              
                              // Navigate to contract preview page to show the updated contract
                              router.push('/contract-preview');
                            } catch (error) {
                              console.error('Error saving changes:', error);
                              alert('שגיאה בשמירת השינויים. אנא נסה שוב.');
                            } finally {
                              setIsLoading(false);
                            }
                          }
                        } else {
                          // Normal flow - continue to next step
                          setStep(step + 1);
                        }
                      }}
                      disabled={!dataApproved}
                    >
                      {isEditingPaidContract ? 'שמור שינויים' : 'המשך'}
                    </button>
                  </div>
                )}
                {/* Payment step */}
                {step === grouped.length + 1 && !shouldHidePaymentSteps && (
                  <div className="w-full">
                    <div className="mb-6 text-center text-gray-700">שלב תשלום</div>
                    {/* Contract preview snapshot styled as in contract-preview page, shrunk to 70% size, tags removed, with fade-out */}
                    <div
                      className="contract-container flex justify-center items-center"
                      style={{
                        width: 'auto',
                        height: 'auto',
                        minHeight: 'auto',
                        padding: '0',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        display: 'flex',
                        marginBottom: '0',
                      }}
                    >
                      <div
                        style={{
                          transform: isMobile ? 'scale(0.7)' : 'scale(0.8)',
                          transformOrigin: 'top center',
                          width: isMobile ? '100vw' : '320mm',
                          height: 'fit-content',
                          minHeight: 'fit-content',
                          pointerEvents: 'auto',
                          boxShadow: 'none',
                          borderRadius: 0,
                          overflow: 'visible',
                          background: 'transparent',
                          border: 'none',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          margin: isMobile ? '0 auto' : undefined,
                        }}
                      >
                        <div className="page" style={{ height: 'fit-content', minHeight: 'fit-content', width: '100%', overflow: 'visible', position: 'relative', padding: '0', boxShadow: 'none', border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                          <div className="contract-title text-center font-bold text-4xl underline mb-0 mt-2" style={{ fontFamily: 'var(--contract-font)', width: '100%', fontSize: isMobile ? '2rem' : '2.8rem' }}>
                            הסכם שכירות למגורים
                          </div>
                          <div className="contract-subtitle text-center text-lg text-gray-800 mb-3 font-medium" style={{ fontFamily: 'var(--contract-font)', width: '100%', fontSize: '1.6rem' }}>
                            (שכירות בלתי מוגנת)
                          </div>
                          <div className="contract-date-row text-center text-base text-gray-800 mb-3" style={{ fontFamily: 'var(--contract-font)', width: '100%', fontSize: '1.4rem' }}>
                            שנעשה ונחתם ב_______, בתאריך _______.
                          </div>
                          <div className="contract-preview" style={{ fontFamily: 'var(--contract-font)', fontSize: '1.3rem', fontWeight: 500, lineHeight: 1.85, color: '#222', direction: 'rtl', whiteSpace: 'pre-wrap', width: '100%' }}>
                            {/* Show only the first ~30 lines of the contract, with HTML tags removed */}
                            {contract?.split('\n').slice(0, 30).map((line, idx, array) => {
                              const plainLine = line.replace(/<[^>]+>/g, '');
                              const isLastLine = idx === array.length - 1;
                              return plainLine.trim() && plainLine.trim() !== '⸻' ? (
                                <div key={idx} style={{ marginBottom: isLastLine ? '0' : '0.7em', width: '100%' }}>{plainLine}</div>
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
                      color: '#281D57',
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
                      <span style={{ color: '#38E18E', fontWeight: 600, fontSize: isMobile ? 20 : 22 }}>₪99</span>
                      <span style={{ fontWeight: 400, fontSize: isMobile ? 15 : 17 }}> | תשלום חד־פעמי</span>
                    </div>
                    <div className="mb-4 text-center">

                      {!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
                        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg text-sm">
                          ⚠️ PayPal מוגדר למצב בדיקה (Sandbox). לתשלומים אמיתיים, הגדר את NEXT_PUBLIC_PAYPAL_CLIENT_ID.
                        </div>
                      )}
                      
                      {paymentError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded-lg text-sm">
                          ❌ {paymentError}
                          <button 
                            onClick={() => setPaymentError(null)}
                            className="ml-2 text-red-600 hover:text-red-800 underline"
                          >
                            סגור
                          </button>
                        </div>
                      )}
                      <PayPalScriptProvider 
                        options={{
                          clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test',
                          currency: 'ILS',
                          intent: 'capture'
                        }}
                      >
                        <PayPalButtons
                          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
                          forceReRender={[process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID]}
                          createOrder={(data, actions) => {
                            return actions.order.create({
                              intent: 'CAPTURE',
                              purchase_units: [
                                {
                                  amount: {
                                    value: '99.00', // Fixed price of 99 ILS
                                    currency_code: 'ILS',
                                  },
                                  description: 'תשלום עבור חוזה שכירות',
                                },
                              ],
                            });
                          }}
                          onApprove={async (data, actions) => {
                            if (actions.order) {
                              try {
                                const order = await actions.order.capture();
                                setPaymentError(null); // Clear any previous errors
                                
                                // Save payment information to Firestore
                                if (user) {
                                  try {
                                    // Get the current contract ID
                                    const contractId = localStorage.getItem('currentContractId');
                                    if (contractId) {
                                      await setDoc(doc(db, 'formAnswers', contractId), {
                                        userId: user.uid,
                                        answers,
                                        updatedAt: new Date(),
                                        status: 'paid', // Set the main status field to paid
                                        paymentStatus: 'paid',
                                        paymentId: order.id,
                                        paymentDate: new Date(),
                                        orderDetails: order,
                                        // Add edit tracking fields
                                        editCount: 0,
                                        maxEdits: 3,
                                        isLocked: false
                                      }, { merge: true });
                                      // Clear the contract ID since this contract is now paid
                                      localStorage.removeItem('currentContractId');
                                    }
                                  } catch (error) {
                                    console.error('Error saving payment info:', error);
                                  }
                                }
                                
                                setStep(step + 1); // Move to preview step
                              } catch (error) {
                                console.error('Payment capture error:', error);
                                setPaymentError('שגיאה באישור התשלום. אנא נסה שוב.');
                              }
                            }
                          }}
                          onError={(err) => {
                            console.error('PayPal Error:', err);
                            let errorMessage = 'שגיאה בתשלום';
                            
                            // Provide more specific error messages based on error type
                            const errorString = String(err);
                            if (errorString.includes('card')) {
                              errorMessage = 'שגיאה בכרטיס האשראי. אנא בדוק את פרטי הכרטיס ונסה שוב.';
                            } else if (errorString.includes('network')) {
                              errorMessage = 'בעיית תקשורת. אנא בדוק את החיבור לאינטרנט ונסה שוב.';
                            } else if (errorString.includes('sandbox')) {
                              errorMessage = 'המערכת במצב בדיקה. אנא פנה למנהל המערכת.';
                            } else {
                              errorMessage = 'שגיאה בתשלום. אנא נסה שוב או השתמש בכרטיס אחר.';
                            }
                            
                            setPaymentError(errorMessage);
                          }}
                          onInit={() => {
                            console.log('PayPal button initialized successfully');
                          }}
                        />
                      </PayPalScriptProvider>
                      
                      {/* Debug Payment Button - Only show in development */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-yellow-800 text-sm mb-3 text-center">
                            🧪 <strong>Debug Mode:</strong> Simulate payment completion for testing (Development Only)
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                console.log('Debug: Simulating payment completion');
                                
                                // Simulate payment completion
                                if (user) {
                                  const contractId = localStorage.getItem('currentContractId');
                                  if (contractId) {
                                    await setDoc(doc(db, 'formAnswers', contractId), {
                                      userId: user.uid,
                                      answers,
                                      updatedAt: new Date(),
                                      status: 'paid', // Set the main status field
                                      paymentStatus: 'paid', // Also set payment status for compatibility
                                      paymentId: 'debug-payment-' + Date.now(),
                                      paymentDate: new Date(),
                                      orderDetails: {
                                        id: 'debug-order-' + Date.now(),
                                        status: 'COMPLETED',
                                        debug: true
                                      },
                                      // Add edit tracking fields
                                      editCount: 0,
                                      maxEdits: 3,
                                      isLocked: false
                                    }, { merge: true });
                                    
                                    // Keep the contract ID in localStorage for the preview page
                                    console.log('Debug: Contract ID kept in localStorage for preview page');
                                    
                                    console.log('Debug: Payment simulation completed successfully');
                                    setStep(step + 1); // Move to preview step
                                  } else {
                                    console.error('Debug: No contract ID found in localStorage');
                                    setPaymentError('Debug: No contract ID found');
                                  }
                                } else {
                                  console.error('Debug: No user logged in');
                                  setPaymentError('Debug: No user logged in');
                                }
                              } catch (error) {
                                console.error('Debug: Payment simulation error:', error);
                                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                setPaymentError('Debug: Payment simulation failed - ' + errorMessage);
                              }
                            }}
                            className="w-full bg-yellow-500 text-white font-bold px-6 py-3 rounded-lg shadow hover:bg-yellow-600 transition-colors text-sm"
                          >
                            🧪 Simulate Payment Completion (Debug)
                          </button>
                        </div>
                      )}
                      

                    </div>
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
                )}
                {/* Preview step - only show for new contracts, not for paid contract editing */}
                {step === (isEditingPaidContract ? -1 : grouped.length + 2) && !isEditingPaidContract && (
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
                    <div className="mb-8 text-center" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif', padding: isMobile ? '0 16px' : '0' }}>
                      {/* Ready for sign image */}
                      <div className="flex justify-center items-center mb-6">
                        <img 
                          src="/ready-for-sign.png" 
                          alt="החוזה מוכן לחתימה" 
                          style={{
                            maxWidth: isMobile ? '80%' : '400px',
                            height: 'auto',
                            borderRadius: '12px'
                          }}
                        />
                      </div>
                      
                      <div className="text-3xl font-bold mb-6" style={{ color: '#281d57' }}>
                        החוזה שלך מוכן!
                      </div>
                      
                      <div className="text-lg text-gray-800 mb-6 leading-relaxed">
                        סיימנו לבנות את חוזה השכירות בהתאם למה שמילאתם.<br />
                        המסמך מסודר, מוכן לחתימה – וכולו שלכם.
                      </div>
                      
                      <div className="text-gray-400 mb-6">⸻</div>
                      
                                          {/* Full contract view button */}
                      <div className="flex justify-center items-center mb-6">
                        <button
                          className="bg-[#38E18E] font-bold px-6 py-3 rounded-lg shadow hover:bg-[#2bc77a] transition-colors text-lg"
                          style={{ color: '#281d57' }}
                          onClick={() => window.open('/contract-preview', '_blank')}
                        >
                          לצפיה בחוזה השכירות המלא
                        </button>
                      </div>
                      
                      <div className="text-gray-400 mb-6">⸻</div>
                      
                      <div className="text-sm text-gray-600 leading-relaxed mb-6">
                        מומלץ לשמור עותק, לעבור עליו בעיון – ולשתף עם השוכר לחתימה.<br />
                        מזכירים שוב: החוזה נועד לשימוש סטנדרטי בלבד ואינו תחליף לייעוץ משפטי.
                      </div>
                      
                      <div className="flex justify-center items-center">
                        <button
                          onClick={() => {
                            // Set the active tab to 'ready' in localStorage so dashboard opens to ready contracts
                            localStorage.setItem('dashboardActiveTab', 'ready');
                            router.push('/dashboard');
                          }}
                          className="bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-lg shadow hover:bg-gray-200 transition-colors text-lg"
                          style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                        >
                          לכל החוזים שלי
                        </button>
                      </div>
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
