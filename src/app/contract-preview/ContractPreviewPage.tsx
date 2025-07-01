'use client';
import html2pdf from 'html2pdf.js';
import React, { useEffect, useState } from 'react';
import contractMerge from '@/utils/contractMerge';

// Extend the Window interface to include html2pdf
declare global {
  interface Window {
    html2pdf?: unknown;
  }
}

// Declare html2pdf on the window object for TypeScript
if (typeof window !== 'undefined') {
  window.html2pdf = window.html2pdf || undefined;
}

// Helper function to format date as dd.mm.yyyy
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '_______';
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '_______';
  }
}

interface ContractMeta {
  contractTitle?: string;
  propertyCity?: string;
  street?: string;
  apartmentNumber?: string;
  landlordName?: string;
  landlordId?: string;
  landlordAddress?: string;
  landlordPhone?: string;
  tenantName?: string;
  tenantIdNumber?: string;
  tenantCity?: string;
  tenantPhone?: string;
  allowPets?: boolean;
  allowSublet?: boolean;
  includeAgreementDetails?: boolean;  // Whether to include agreement date and location
  agreementCity?: string;  // City where agreement was signed
  agreementDate?: string;  // Date when agreement was signed
  lateInterestType?: string;
  lateInterestFixedAmount?: string;
  evacuationPenaltyType?: string;
  evacuationPenaltyFixedAmount?: string;
  buildingNumber?: string;
  floor?: string;
  entrance?: string;
  [key: string]: string | boolean | undefined; // Allow any other properties
}

function formatContractText(text: string): string {
  // Split the text into lines
  const lines = text.split('\n');
  
  // Process each line
  const formattedLines = lines.map(line => {
    // Match different levels of numbering
    const level1Match = line.match(/^(\d+)\./); // e.g. "1."
    const level2Match = line.match(/^(\d+\.\d+)/); // e.g. "1.1"
    const level3Match = line.match(/^(\d+\.\d+\.\d+)/); // e.g. "1.1.1"
    const level4Match = line.match(/^(\d+\.\d+\.\d+\.\d+)/); // e.g. "1.1.1.1"

    if (level4Match) {
      return `            ${line}`; // 12 spaces for level 4
    } else if (level3Match) {
      return `         ${line}`; // 9 spaces for level 3
    } else if (level2Match) {
      return `   ${line}`; // 3 spaces for level 2
    } else if (level1Match) {
      return line; // No indentation for level 1
    }
    
    return line; // No indentation for regular text
  });

  return formattedLines.join('\n');
}

export default function ContractPreviewPage() {
  const [contract, setContract] = useState('');
  const [meta, setMeta] = useState<ContractMeta | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Update document title with apartment address when metadata is available
    if (meta?.street && meta?.propertyCity) {
      document.title = `הסכם שכירות למגורים - ${meta.street}, ${meta.propertyCity}`;
    }
  }, [meta]);

  useEffect(() => {
    // Load template from public folder
    fetch('/data/master-template.txt')
      .then(response => response.text())
      .then(template => {
        // Get data from localStorage
        const metaStr = localStorage.getItem('contractMeta');
        let data: ContractMeta = {};
        let rawData: any = {};
        try {
          if (metaStr) {
            rawData = JSON.parse(metaStr);
            // Flatten all keys from rawData, landlords[0], and tenants[0]
            data = {
              ...rawData,
              ...(Array.isArray(rawData.landlords) && rawData.landlords[0] ? rawData.landlords[0] : {}),
              ...(Array.isArray(rawData.tenants) && rawData.tenants[0] ? rawData.tenants[0] : {}),
            };
            setMeta(data);
          }
        } catch (error) {
          console.error('Error parsing contract data:', error);
          setMeta(null);
        }

        // Log the data passed to contractMerge for verification
        console.log('ContractPreviewPage: data passed to contractMerge:', data);

        // Merge template with data
        let mergedContract = contractMerge(template, data);

        // Handle multiple tenants if present
        if (Array.isArray(rawData.tenants) && rawData.tenants.length > 1) {
          // Handle tenants in the main contract section (at the top)
          const tenantLines = rawData.tenants.map((tenant: any, idx: number) => {
            const name = tenant.tenantName || '-';
            const id = tenant.tenantIdNumber || '-';
            const city = tenant.tenantCity || '-';
            const phone = tenant.tenantPhone || '-';
            return `${idx + 1}. <strong>השוכר :</strong> <strong>${name}</strong>, ת"ז <strong>${id}</strong>, עיר מגורים: <strong>${city}</strong>, טלפון: <strong>${phone}</strong>`;
          }).join('\n');
          
          // Replace only the first occurrence (in the main contract section)
          const firstOccurrence = mergedContract.indexOf('השוכר:');
          if (firstOccurrence !== -1) {
            const beforeText = mergedContract.substring(0, firstOccurrence);
            const afterText = mergedContract.substring(firstOccurrence + 7);
            const nextNewline = afterText.indexOf('\n');
            mergedContract = beforeText + tenantLines + afterText.substring(nextNewline);
          }

          // For section 15 (signatures), create simpler signature lines
          const signatureLines = rawData.tenants.map((tenant: any, idx: number) => {
            const name = tenant.tenantName || '-';
            const id = tenant.tenantIdNumber || '-';
            return `
<div class="signature-block">
<strong>שוכר ${idx + 1}</strong>: ____________________
שם: <strong>${name}</strong> | ת"ז: <strong>${id}</strong>
</div>`;
          }).join('\n');

          // Replace the signature section
          const signatureSection = `15. חתימות

<div class="signature-header">ולראיה באו הצדדים על החתום</div>

<div class="signature-block">
<strong>המשכיר</strong>: ____________________
שם: <strong>${data.landlordName}</strong> | ת"ז: <strong>${data.landlordId}</strong>
</div>

${signatureLines}`;

          // Find and replace the entire section 15
          const section15Start = mergedContract.indexOf('15. חתימות');
          const section15End = mergedContract.indexOf('⸻\n\n16.');
          
          if (section15Start !== -1 && section15End !== -1) {
            mergedContract = 
              mergedContract.substring(0, section15Start) +
              signatureSection +
              mergedContract.substring(section15End);
          }
        }

        // Format the contract text with indentation
        mergedContract = formatContractText(mergedContract);
        
        setContract(mergedContract);
      })
      .catch(error => {
        console.error('Error loading contract template:', error);
        setContract('Error loading contract template');
      });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!emailToSend && typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('userEmail'); // or get from your auth state
      if (userEmail) setEmailToSend(userEmail);
    }
  }, []);

  return (
    <>
      <main className="min-h-screen flex flex-col items-center bg-white text-gray-900" style={{ fontFamily: 'var(--contract-font)' }} dir="rtl">
        {/* Sticky Header with Preview Title and Print Button */}
        <header className="print-hidden" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          background: 'rgba(255,255,255,0.98)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          zIndex: 1000
        }}>
          <div className="text-xl font-bold" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>תצוגה מקדימה של החוזה</div>
          <div className="flex gap-2">
            <button
              className="bg-[#2563eb] text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-[#1d4ed8] transition-colors flex items-center justify-center min-w-[120px]"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  const contractNode = document.querySelector('.contract-preview');
                  if (!contractNode) return;
                  let css = '';
                  for (const sheet of Array.from(document.styleSheets)) {
                    try {
                      css += Array.from(sheet.cssRules).map(rule => rule.cssText).join(' ');
                    } catch (e) { /* ignore CORS issues */ }
                  }
                  const html = contractNode.outerHTML;
                  const response = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ html, css }),
                  });
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'contract.pdf';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } else {
                    alert('PDF generation failed');
                  }
                } finally {
                  setDownloading(false);
                }
              }}
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                  מעבד PDF...
                </span>
              ) : (
                'הורד PDF'
              )}
            </button>
            <button
              className="bg-blue-500 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
              onClick={() => setShowEmailModal(true)}
            >
              שלח במייל
            </button>
            <button
              className="bg-[#38E18E] text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-[#2bc77a] transition-colors"
              onClick={() => window.print()}
            >
              הדפס
            </button>
          </div>
        </header>
        {/* Email Modal */}
        {showEmailModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.25)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
          }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.12)', fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              <div className="mb-4 text-lg font-bold" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>שלח את החוזה במייל</div>
              <input
                type="email"
                value={emailToSend}
                onChange={e => setEmailToSend(e.target.value)}
                className="border rounded px-3 py-2 w-full mb-4"
                placeholder="הזן כתובת מייל"
                style={{ direction: 'ltr', fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
              />
              <div className="flex gap-2">
                <button
                  className="bg-blue-500 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[100px]"
                  disabled={sending}
                  onClick={async () => {
                    setSending(true);
                    setSendResult(null);
                    const contractNode = document.querySelector('.contract-preview');
                    if (!contractNode) return;
                    let css = '';
                    for (const sheet of Array.from(document.styleSheets)) {
                      try {
                        css += Array.from(sheet.cssRules).map(rule => rule.cssText).join(' ');
                      } catch (e) {}
                    }
                    const html = contractNode.outerHTML;
                    const response = await fetch('/api/send-pdf', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ html, css, email: emailToSend }),
                    });
                    setSending(false);
                    if (response.ok) {
                      setSendResult('החוזה נשלח למייל!');
                    } else {
                      setSendResult('שליחת המייל נכשלה');
                    }
                  }}
                  style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                >
                  {sending ? (
                    <span className="flex items-center gap-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      שולח...
                    </span>
                  ) : (
                    'שלח'
                  )}
                </button>
                <button
                  className="bg-gray-200 text-gray-800 font-bold px-6 py-2 rounded-lg shadow hover:bg-gray-300 transition-colors"
                  onClick={() => setShowEmailModal(false)}
                  style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                >
                  ביטול
                </button>
              </div>
              {sendResult && <div className="mt-4 text-center text-sm" style={{ color: sendResult.includes('נשלח') ? '#38E18E' : '#e11d48', fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>{sendResult}</div>}
            </div>
          </div>
        )}
        {/* Spacer to prevent content from being hidden under the sticky header */}
        <div className="print-spacer" style={{ height: 72 }} />
        
        {/* Contract Content */}
        <div className="contract-preview max-w-4xl mx-auto w-full px-8 whitespace-pre-wrap" style={{ lineHeight: 'initial' }}>
          {/* Contract Title and Header */}
          <div className="contract-title text-center font-bold text-4xl underline mb-0 mt-10" style={{ fontFamily: 'Frank Ruhl Libre, Noto Sans Hebrew, Arial, sans-serif', fontWeight: 700, fontSize: '2.25rem', textDecoration: 'underline', marginBottom: 0, marginTop: '2.5rem', letterSpacing: '0.01em', color: '#111', lineHeight: 1.1 }}>
            הסכם שכירות למגורים
          </div>
          <div className="contract-subtitle text-center text-lg text-gray-800 mb-3 font-medium" style={{ fontFamily: 'Frank Ruhl Libre, Noto Sans Hebrew, Arial, sans-serif', fontWeight: 600, fontSize: '1.18rem', color: '#111', marginBottom: 18, marginTop: 0, letterSpacing: '0.01em', lineHeight: 1.2 }}>
            (שכירות בלתי מוגנת)
          </div>
          <div className="contract-date-row text-center text-base text-gray-800 mb-3" style={{ fontFamily: 'Frank Ruhl Libre, Noto Sans Hebrew, Arial, sans-serif', fontWeight: 400, fontSize: '1.05rem', color: '#222', marginBottom: 12, marginTop: 0, letterSpacing: '0.01em', lineHeight: 1.2 }}>
            שנעשה ונחתם ב{meta?.includeAgreementDetails ? (meta?.agreementCity || '_______') : '_______'}, בתאריך {meta?.includeAgreementDetails ? formatDate(meta?.agreementDate) : '_______'}.
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {contract.split('\n').map((line, index) => {
              // Skip empty lines and separator lines
              if (!line.trim() || line.trim() === '⸻') return null;

              // Special handling for 5.1 and 5.2
              if (line.trim().startsWith('5.1')) {
                let bullet = '-';
                if (meta) {
                  switch (meta.lateInterestType) {
                    case 'לא לגבות ריבית בכלל':
                      bullet = 'בגין איחור בתשלום מכל סוג שהוא, לא תגבה ריבית פיגורים.';
                      break;
                    case '0.03% ליום (סטנדרטי)':
                      bullet = 'בגין איחור בתשלום מכל סוג שהוא, ישלם השוכר ריבית פיגורים בשיעור 0.03% ליום.';
                      break;
                    case 'סכום קבוע':
                      bullet = `בגין איחור בתשלום מכל סוג שהוא, ישלם השוכר ריבית פיגורים בסך ${meta.lateInterestFixedAmount || '-'} ש"ח ליום.`;
                      break;
                    default:
                      bullet = '-';
                  }
                }
                return (
                  <div key={index}>
                    5.1 {bullet}
                  </div>
                );
              }
              if (line.trim().startsWith('5.2')) {
                let bullet = '-';
                if (meta) {
                  switch (meta.evacuationPenaltyType) {
                    case 'לא לגבות דמי שימוש בכלל':
                      bullet = 'בגין איחור בפינוי המושכר, לא ייגבו דמי שימוש.';
                      break;
                    case 'לגבות 2% מדמי השכירות היומיים':
                      bullet = 'בגין איחור בפינוי המושכר, ישלם השוכר דמי שימוש בסך 2% מדמי השכירות היומיים עבור כל יום איחור.';
                      break;
                    case 'לגבות 5% מדמי השכירות היומיים':
                      bullet = 'בגין איחור בפינוי המושכר, ישלם השוכר דמי שימוש בסך 5% מדמי השכירות היומיים עבור כל יום איחור.';
                      break;
                    case 'לגבות סכום קבוע ליום':
                      bullet = `בגין איחור בפינוי המושכר, ישלם השוכר דמי שימוש בסך ${meta.evacuationPenaltyFixedAmount || '-'} ש"ח ליום עבור כל יום איחור.`;
                      break;
                    default:
                      bullet = '-';
                  }
                }
                return (
                  <div key={index}>
                    5.2 {bullet}
                  </div>
                );
              }

              // Check if the line starts with a number pattern (main sections or subsections)
              const isMainSection = /^\d+\.(?!\d)/.test(line.trim());
              const isSubSection = /^\d+\.\d+/.test(line.trim());
              const sectionNumber = line.trim().match(/^(\d+)\.(?!\d)/)?.[1];

              // Add bold to section numbers and "המושכר"
              if (isSubSection || line.includes('<strong>')) {
                return (
                  <div key={index} dangerouslySetInnerHTML={{
                    __html: line
                      .replace(/^(\d+\.\d+)(?!<)/, '<strong>$1</strong>')
                      .replace(/"המושכר"/g, '<strong>"המושכר"</strong>')
                  }} />
                );
              }

              // Process contract parties section
              if (line.includes('בין:') || line.includes('לבין') || 
                  line.includes('המשכיר') || line.includes('השוכר') ||
                  line.includes('הואיל')) {
                
                // Replace specific words with bold versions
                let processedLine = line
                  .replace(/"המשכיר"/g, '<strong>"המשכיר"</strong>')
                  .replace(/"השוכר"/g, '<strong>"השוכר"</strong>')
                  .replace(/בין:/g, '<strong>בין:</strong>')
                  .replace(/המשכיר:/g, '<strong>המשכיר:</strong>')
                  .replace(/\(להלן: "המשכיר"\)/g, '(להלן: <strong>"המשכיר"</strong>)')
                  .replace(/לבין:/g, '\n\n<strong>לבין:</strong>')
                  .replace(/לבין/g, '\n\n<strong>לבין</strong>')
                  .replace(/השוכר :/g, '<strong>השוכר :</strong>')
                  .replace(/השוכר:/g, '<strong>השוכר:</strong>')
                  .replace(/\(להלן: "השוכר"\)/g, '(להלן: <strong>"השוכר"</strong>)')
                  .replace(/והואיל/g, '<strong>והואיל</strong>')
                  .replace(/^הואיל/g, '<strong>הואיל</strong>')
                  .replace(/;(\s*)$/g, ';') 
                  .replace(/כדלקמן:(\s*)$/g, 'כדלקמן:');

                // Skip the line with agreement date/city
                if (line.includes('הסכם זה נעשה ונחתם')) {
                  return null;
                }

                // Make values bold (everything after ":" except for parenthetical phrases)
                processedLine = processedLine.replace(
                  /(?:המשכיר:|השוכר:|השוכר :)([^(]*)(\([^)]*\))?/g,
                  (match, values, parenthetical) => {
                    if (!values) return match;
                    const boldValues = values
                      .split(',')
                      .map((v: string) => {
                        const [label, value] = v.split(':').map(part => part.trim());
                        if (value) {
                          return `${label}: <strong>${value}</strong>`;
                        }
                        return `<strong>${v.trim()}</strong>`;
                      })
                      .filter(Boolean)
                      .join(', ');
                    // Return only the label and bold values, without the original values
                    const label = match.match(/(?:המשכיר:|השוכר:|השוכר :)/)?.[0] || '';
                    return label + ' ' + boldValues + (parenthetical ? '<br/>' + parenthetical : '');
                  }
                );

                return (
                  <div 
                    key={index} 
                    className="contract-party-section"
                    style={{ marginBottom: '1em' }}
                    dangerouslySetInnerHTML={{ __html: processedLine }}
                  />
                );
              }

              // Handle the special centered line
              if (line.includes('אי לכך הוסכם, הוצהר והותנה בין הצדדים כדלקמן:')) {
                return (
                  <div 
                    key={index}
                    className="text-center font-bold my-4 text-xl"
                  >
                    {line}
                  </div>
                );
              }

              // Regular line processing
              return (
                <div 
                  key={index} 
                  className={isMainSection ? 'main-section' : ''} 
                  style={{ marginBottom: '1em' }}
                  {...(sectionNumber ? { 'data-section': sectionNumber } : {})}
                  dangerouslySetInnerHTML={{ __html: line }}
                />
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
} 