'use client';
import React, { useEffect, useState } from 'react';
import FormRenderer from '../components/FormRenderer';
import ContractPreview from '../components/ContractPreview';
import contractMerge, { MergeData } from '../utils/contractMerge';
import { db } from '../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Question as QType } from '../utils/visibilityLogic';
import { useRouter } from 'next/navigation';

// Build steps dynamically from groups
const GROUPS = [
  {
    title: 'פרטי המשכיר והשוכר',
    ids: [
      'landlordName', 'landlordId', 'landlordAddress', 'landlordPhone',
      'tenantName', 'tenantIdNumber', 'tenantCity', 'tenantPhone',
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
    title: 'הסכמות נוספות',
    ids: ['allowSign', 'agreementDate', 'agreementCity'],
  },
];

// Brand primary green from image
const PRIMARY_GREEN = '#38E18E';

// Steps: one per group, then payment, then preview
const STEPS = [
  ...GROUPS.map(g => ({ label: g.title, key: g.title })),
  { label: 'תשלום', key: 'payment' },
  { label: 'תצוגה מקדימה', key: 'preview' },
];

export default function HomePage() {
  const [questions, setQuestions] = useState<QType[]>([]);
  const [template, setTemplate] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [contract, setContract] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showPayment, setShowPayment] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Load questions and template
    import('../../data/full_rental_contract_questions.json').then(mod => setQuestions((mod.default || mod) as QType[]));
    fetch('/data/master-template.txt')
      .then(res => res.text())
      .then(setTemplate);
  }, []);

  useEffect(() => {
    // Merge contract
    let merged = contractMerge(template, answers as MergeData);
    // Remove conditional blocks (simple MVP: no #if logic)
    merged = merged.replace(/{{#if [^}]+}}([\s\S]*?){{\/if}}/g, (m, content) => {
      // Check if the condition is met
      const match = m.match(/{{#if ([^}]+)}}/);
      if (!match) return '';
      const key = match[1].trim();
      if (answers[key]) return content.trim();
      return '';
    });
    setContract(merged);
  }, [template, answers]);

  // PDF download (simple print for MVP)
  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await addDoc(collection(db, 'responses'), {
        answers,
        createdAt: new Date().toISOString(),
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleOpenPrintPreview = () => {
    if (!contract || contract.trim() === '') {
      alert('לא ניתן להציג תצוגה מקדימה – יש למלא את כל השדות הנדרשים בטופס.');
      return;
    }
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      // Use JSON.stringify to safely pass contract content
      const contractJson = JSON.stringify(contract);
      previewWindow.document.write(`
        <div style="background: #e5e7eb; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 40px 0;">
          <style>
            .page { background: #fff; width: 794px; min-height: 1123px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 8px; padding: 60px 70px 60px 70px; font-family: 'Frank Ruhl Libre', 'Noto Sans Hebrew', 'Segoe UI', Arial, sans-serif; color: #222; font-size: 1.1rem; line-height: 1.8; direction: rtl; position: relative; }
            .contract-title { font-size: 2rem; font-weight: bold; margin-bottom: 32px; text-align: center; }
            .contract-preview { font-size: 1.1rem; font-weight: 500; }
            .section-title { font-weight: bold; font-size: 1.15rem; margin-top: 2.2em; margin-bottom: 0.7em; }
            .highlight { font-weight: bold; color: #2563eb; }
            @media print { button { display: none; } @page { margin: 0; } body { margin: 0; } }
            .print-btn { position: fixed; top: 24px; right: 24px; z-index: 1000; padding: 12px 28px; font-size: 1.1rem; background: #2563eb; color: #fff; border: none; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: pointer; transition: background 0.2s; margin-left: 12px; }
            .print-btn:hover { background: #1d4ed8; }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" rel="stylesheet">
          <div style="position: relative; width: 794px;">
            <button class="print-btn" onclick="window.print()">הדפס</button>
            <div class="page">
              <div class="contract-title">הסכם שכירות</div>
              <div class="contract-preview" id="contract-content"></div>
            </div>
          </div>
          <script>
            window.contractContent = ${contractJson};
            function escapeRegExp(string) { return string.replace(/[.*+?^$()|[\\]\\]/g, '\\$&'); }
            function enhanceContract(text) {
              text = text.replace(/(\d+\.[^<\n]*)/g, function(m) { return m.replace(/^(\d+\.)/, '<span class=\"section-title\">$1</span>'); });
              const keywords = ['הואיל', 'המשכיר', 'השוכר', 'הצדדים', 'הסכם', 'הנכס', 'הבטחונות', 'הערבים', 'הפיקדון', 'המחסן', 'החניה'];
              keywords.forEach(word => { const re = new RegExp('(?<![\\w-])(' + escapeRegExp(word) + ')(?![\\w-])', 'g'); text = text.replace(re, '<span class=\"highlight\">$1</span>'); });
              return text;
            }
            const content = window.contractContent && window.contractContent.trim() !== '' ? enhanceContract(window.contractContent.replace(/\n/g, '<br/>')) : '<span style=\"color:red\">לא נמצא תוכן חוזה להצגה</span>';
            document.getElementById('contract-content').innerHTML = content;
          </script>
        </div>
      `);
      previewWindow.document.close();
    }
  };

  // Group questions for steps
  const grouped = GROUPS.map(group => ({
    title: group.title,
    questions: questions.filter(q => group.ids.includes(q.id)),
  })).filter(g => g.questions.length > 0);

  // Stepper UI
  function Stepper() {
    return (
      <div className="fixed top-0 left-0 w-full z-30 flex justify-center items-center py-5 px-2" style={{ background: 'white', borderBottom: '1px solid #e5e7eb', borderRadius: '0 0 18px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', minHeight: 90 }}>
        <div className="flex justify-center items-end gap-0 w-full overflow-x-auto scrollbar-hide" style={{ alignItems: 'flex-end' }}>
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-col items-center min-w-[72px] mx-1" style={{ justifyContent: 'flex-end' }}>
              <div
                className={`flex items-center justify-center transition-all duration-200
                  ${i < step
                    ? 'bg-green-500 border-green-500 text-white shadow-md'
                    : i === step
                      ? 'bg-[#38E18E] border-[#38E18E] text-white shadow-lg'
                      : 'bg-gray-200 border-gray-300 text-gray-400'}
                `}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  borderWidth: 2,
                  fontWeight: 700,
                  fontSize: 18,
                  boxShadow: i === step ? '0 2px 8px rgba(56,225,142,0.18)' : undefined,
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

  return (
    <main className="min-h-screen flex flex-col items-center bg-[#EDF5EE] px-4 py-10 text-gray-900" style={{ paddingTop: 80 }} dir="rtl">
      <Stepper />
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8 flex flex-col items-center mt-8" style={{ alignItems: 'stretch' }}>
        {/* Step name/label */}
        <div className="text-xl font-semibold mb-4 text-center text-gray-900">
          {step < grouped.length ? grouped[step]?.title : STEPS[step]?.label}
        </div>
        {/* Question group steps */}
        {step < grouped.length && (
          <div className="w-full">
            <FormRenderer
              groups={[grouped[step]]}
              answers={answers}
              setAnswers={setAnswers}
              onComplete={() => setStep(step + 1)}
            />
          </div>
        )}
        {/* Payment step */}
        {step === grouped.length && (
          <div className="w-full">
            <div className="mb-6 text-center text-gray-700">שלב תשלום</div>
            <form className="space-y-4 mb-4">
              <div>
                <label className="block mb-1 font-bold">מספר כרטיס</label>
                <input type="text" className="border rounded px-3 py-2 w-full text-right" placeholder="1234 5678 9012 3456" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block mb-1 font-bold">תוקף</label>
                  <input type="text" className="border rounded px-3 py-2 w-full text-right" placeholder="MM/YY" />
                </div>
                <div className="w-24">
                  <label className="block mb-1 font-bold">CVV</label>
                  <input type="text" className="border rounded px-3 py-2 w-full text-right" placeholder="123" />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-bold">שם בעל הכרטיס</label>
                <input type="text" className="border rounded px-3 py-2 w-full text-right" placeholder="שם מלא" />
              </div>
            </form>
            <button
              className="w-full py-3 rounded-lg font-bold text-lg"
              style={{ background: PRIMARY_GREEN, color: '#fff' }}
              onClick={() => setStep(step + 1)}
            >
              המשך לתצוגה מקדימה
            </button>
            {step > 0 && (
              <button
                className="w-full py-3 rounded-lg font-bold text-lg mt-2 bg-gray-200 text-gray-700"
                onClick={() => setStep(step - 1)}
              >
                הקודם
              </button>
            )}
          </div>
        )}
        {/* Preview step */}
        {step === grouped.length + 1 && (
          <div className="w-full">
            <div className="mb-6 text-center text-gray-900">תצוגה מקדימה של ההסכם</div>
            <div className="flex gap-2 justify-center">
              <button
                className="py-2 px-6 rounded-lg font-bold text-lg"
                style={{ background: PRIMARY_GREEN, color: '#fff' }}
                onClick={() => {
                  if (contract && contract.trim() !== '') {
                    localStorage.setItem('contractText', contract);
                    window.open('/contract-preview', '_blank');
                  } else {
                    alert('לא ניתן להציג תצוגה מקדימה – יש למלא את כל השדות הנדרשים בטופס.');
                  }
                }}
                disabled={!contract || contract.trim() === ''}
              >
                עמוד תצוגה ייעודי
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
