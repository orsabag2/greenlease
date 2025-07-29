'use client';
import html2pdf from 'html2pdf.js';
import React, { useEffect, useState } from 'react';
import contractMerge from '@/utils/contractMerge';
import { auth, db } from '@/utils/firebase';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
// REMOVE: import { PDFDownloadLink } from '@react-pdf/renderer';
// REMOVE: import ContractPdfDocument from './ContractPdfDocument';

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

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default function ContractPreviewPage() {
  const [contract, setContract] = useState('');
  const [meta, setMeta] = useState<ContractMeta | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const router = useRouter();

  // Authentication check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setUser(u);
      setLoadingAuth(false);
      if (!u) {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Payment verification
  useEffect(() => {
    if (!user) return;

    const verifyPayment = async () => {
      try {
        setLoadingPayment(true);
        
        // Get the contract ID from localStorage
        const contractId = localStorage.getItem('currentContractId');
        
        if (!contractId) {
          console.error('No contract ID found in localStorage');
          router.push('/dashboard');
          return;
        }
        
        const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
        
        if (contractDoc.exists()) {
          const data = contractDoc.data();
          // Check both paymentStatus and status fields for compatibility
          if (data.paymentStatus === 'paid' || data.status === 'paid') {
            setPaymentVerified(true);
          } else {
            // Redirect to dashboard if payment not completed
            router.push('/dashboard');
          }
        } else {
          // No contract data found, redirect to dashboard
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        router.push('/dashboard');
      } finally {
        setLoadingPayment(false);
      }
    };

    verifyPayment();
  }, [user, router]);

  useEffect(() => {
    // Update document title with apartment address when metadata is available
    if (meta) {
      const addressParts = [];
      if (meta.street) addressParts.push(meta.street);
      if (meta.buildingNumber) addressParts.push(meta.buildingNumber);
      if (meta.apartmentNumber) addressParts.push(`דירה ${meta.apartmentNumber}`);
      if (meta.propertyCity) addressParts.push(meta.propertyCity);
      
      const fullAddress = addressParts.length > 0 ? addressParts.join(' ') : 'כתובת לא זמינה';
      document.title = `הסכם שכירות למגורים - ${fullAddress}`;
      
      // Change favicon to green contract icon
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/svg+xml';
      link.rel = 'icon';
      link.href = '/contract-favicon.svg';
      if (!document.querySelector("link[rel*='icon']")) {
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    }
    
    // Cleanup function to restore original favicon when component unmounts
    return () => {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) {
        link.href = '/favicon.png';
        link.type = 'image/png';
      }
    };
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

        // Remove conditional blocks (simple MVP: no #if logic)
        mergedContract = mergedContract.replace(/{{#if [^}]+}}([\s\S]*?){{\/if}}/g, (m, content) => {
          // Check if the condition is met
          const match = m.match(/{{#if \(eq ([^)]+) "([^"]+)"\)}}/);
          if (match) {
            const key = match[1].trim();
            const expectedValue = match[2].trim();
            console.log(`Condition check: ${key} = "${data[key]}" expected "${expectedValue}"`);
            if (data[key] === expectedValue) {
              console.log(`Condition met, including content: ${content.trim()}`);
              return content.trim();
            }
            console.log(`Condition not met, removing content`);
            return '';
          }
          
          // Fallback for simple conditions
          const simpleMatch = m.match(/{{#if ([^}]+)}}/);
          if (simpleMatch) {
            const key = simpleMatch[1].trim();
            if (data[key]) return content.trim();
            return '';
          }
          
          return '';
        });

        // Clean up any remaining conditional block artifacts or extra dashes
        mergedContract = mergedContract
          .replace(/\n\s*-\s*\n/g, '\n') // Remove lines with just dashes
          .replace(/\n\s*{{#if[^}]*}}\s*\n/g, '\n') // Remove any remaining #if tags
          .replace(/\n\s*{{\/if}}\s*\n/g, '\n') // Remove any remaining /if tags
          .replace(/\n\s*-\s*$/gm, '\n') // Remove dashes at end of lines
          .replace(/^\s*-\s*\n/gm, '\n') // Remove dashes at start of lines
          .replace(/\n\s*-\s*\n/g, '\n') // Remove standalone dash lines
          .replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines

        // Additional cleanup: Remove garden maintenance clause if not selected
        if (data.gardenMaintenance !== "כן, ברצוני שהשוכר יהיה אחראי על תחזוקת הגינה") {
          console.log('Garden maintenance not selected, removing clause');
          mergedContract = mergedContract.replace(/6\.3 השוכר מתחייב לבצע תחזוקה שוטפת של הגינה הצמודה למושכר, לרבות השקיה, ניקיון וגיזום, ולשמור על מצבה התקין לאורך כל תקופת השכירות\.\n?/g, '');
          
          // Renumber the subsequent clauses after removing 6.3
          mergedContract = mergedContract
            .replace(/^6\.4/gm, '6.3')
            .replace(/^6\.5/gm, '6.4')
            .replace(/^6\.6/gm, '6.5')
            .replace(/^6\.7/gm, '6.6');
        }

        // Additional cleanup specifically for clause 6.3 area
        mergedContract = mergedContract
          .replace(/(6\.2[^\n]*)\n\s*-\s*\n(6\.3[^\n]*)/g, '$1\n$2') // Remove dash between 6.2 and 6.3
          .replace(/(6\.3[^\n]*)\n\s*-\s*\n(6\.4[^\n]*)/g, '$1\n$2') // Remove dash between 6.3 and 6.4
          .replace(/\n\s*-\s*\n/g, '\n') // Remove any standalone dash lines
          .replace(/\n\s*-\s*$/gm, '\n') // Remove dashes at end of lines
          .replace(/^\s*-\s*\n/gm, '\n') // Remove dashes at start of lines
          .replace(/\n\s*-\s*\n/g, '\n'); // Final pass to catch any remaining dashes



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
        
        // Final cleanup to remove any remaining dashes
        mergedContract = mergedContract
          .replace(/\n\s*-\s*\n/g, '\n')
          .replace(/\n\s*-\s*$/gm, '\n')
          .replace(/^\s*-\s*\n/gm, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/<div><strong>-<\/strong><\/div>/g, '') // Remove HTML dash divs
          .replace(/<div>\s*<strong>-\s*<\/strong>\s*<\/div>/g, '') // Remove HTML dash divs with whitespace
          .replace(/<div>\s*-\s*<\/div>/g, '') // Remove any div containing just a dash
          .replace(/<strong>-<\/strong>/g, '') // Remove any strong tags with just a dash
          .replace(/<div>\s*<strong>-<\/strong>\s*<\/div>/g, '') // Remove div with strong dash
          .replace(/<div>\s*-\s*<\/div>/g, ''); // Remove any div with just a dash
        
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

  // Show loading state while checking authentication and payment
  if (loadingAuth || loadingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38E18E] mx-auto"></div>
          <p className="mt-4 text-gray-600" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            {loadingAuth ? 'בודק הרשאות...' : 'בודק תשלום...'}
          </p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or payment not verified
  if (!user || !paymentVerified) {
    return null; // Will redirect via useEffect
  }

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
          flexDirection: 'column',
          padding: '16px 32px',
          zIndex: 1000
        }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 transition-colors text-sm flex items-center gap-1 cursor-pointer"
              style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>החוזים שלי</span>
            </button>
          </div>
          
          {/* Main Header Content */}
          <div className="flex items-center justify-between w-full">
            <div className="text-lg font-bold" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              {meta ? (() => {
                const addressParts = [];
                if (meta.street) addressParts.push(meta.street);
                if (meta.buildingNumber) addressParts.push(meta.buildingNumber);
                if (meta.apartmentNumber) addressParts.push(`דירה ${meta.apartmentNumber}`);
                if (meta.propertyCity) addressParts.push(meta.propertyCity);
                
                const fullAddress = addressParts.length > 0 ? addressParts.join(' ') : 'כתובת לא זמינה';
                return `הסכם שכירות למגורים ל${fullAddress}`;
              })() : 'תצוגה מקדימה של החוזה'}
            </div>
            <div className="flex gap-2">
                          <button
                className="bg-[#38E18E] text-[#281D57] font-bold px-4 py-1.5 rounded-lg shadow hover:bg-[#2bc77a] transition-colors flex items-center justify-center min-w-[100px] text-sm"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  try {
                    const contractNode = document.querySelector('.contract-preview');
                    if (!contractNode) {
                      alert('לא נמצא תוכן החוזה להורדה');
                      return;
                    }
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
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                    מעבד PDF...
                  </span>
                ) : (
                  'הורד PDF'
                )}
              </button>
              <button
                className="bg-[#38E18E] text-[#281D57] font-bold px-4 py-1.5 rounded-lg shadow hover:bg-[#2bc77a] transition-colors text-sm"
                onClick={() => setShowEmailModal(true)}
              >
                שלח במייל
              </button>
              <button
                className="bg-[#38E18E] text-[#281D57] font-bold px-4 py-1.5 rounded-lg shadow hover:bg-[#2bc77a] transition-colors text-sm"
                onClick={() => window.print()}
              >
                הדפס
              </button>
            </div>
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
            <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.12)', fontFamily: 'Noto Sans Hebrew, Arial, sans-serif', position: 'relative' }}>
              {/* Close Button */}
              <button
                onClick={() => setShowEmailModal(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
              
              {/* Title above image */}
              <div className="mb-4 text-lg font-bold text-center" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>שלח את החוזה במייל</div>
              
              {/* Email Illustration */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <img 
                  src="/send-email.png" 
                  alt="Send Email" 
                  style={{ 
                    maxWidth: '400px', 
                    maxHeight: '280px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    marginBottom: '16px'
                  }} 
                />
              </div>
              <input
                type="email"
                value={emailToSend}
                onChange={e => {
                  setEmailToSend(e.target.value);
                  setEmailError(null); // Clear error when user types
                  setSendResult(null); // Clear previous result
                }}
                className={`border rounded px-3 py-2 w-full mb-2 ${emailError ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="הזן כתובת מייל"
                style={{ direction: 'ltr', fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
              />
              {emailError && (
                <div className="text-red-500 text-sm mb-4" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                  {emailError}
                </div>
              )}
              <div className="w-full">
                <button
                  className="bg-[#38E18E] text-[#281D57] font-bold px-8 py-2 rounded-lg shadow hover:bg-[#2bc77a] transition-colors flex items-center justify-center w-full text-sm"
                  disabled={sending}
                  onClick={async () => {
                    // Validate email before sending
                    if (!emailToSend.trim()) {
                      setEmailError('נא להזין כתובת מייל');
                      return;
                    }
                    
                    if (!isValidEmail(emailToSend.trim())) {
                      setEmailError('נא להזין כתובת מייל תקינה');
                      return;
                    }
                    
                    setEmailError(null);
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
                      body: JSON.stringify({ 
                        html, 
                        css, 
                        email: emailToSend.trim(),
                        propertyAddress: meta ? `${meta.street || ''} ${meta.buildingNumber || ''} ${meta.apartmentNumber || ''} ${meta.propertyCity || ''}`.trim() : ''
                      }),
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
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      שולח...
                    </span>
                  ) : (
                    'שלח'
                  )}
                </button>
              </div>
              {sendResult && <div className="mt-4 text-center text-sm" style={{ color: sendResult.includes('נשלח') ? '#38E18E' : '#e11d48', fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>{sendResult}</div>}
            </div>
          </div>
        )}
        {/* Spacer to prevent content from being hidden under the sticky header */}
        <div className="print-spacer" style={{ height: 72 }} />
        
        {/* Contract Content */}
        <div className="contract-preview max-w-4xl mx-auto w-full px-8 whitespace-pre-wrap"
          style={{ lineHeight: 'initial', direction: 'rtl', color: '#111', fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
          {/* Contract Title and Header */}
          <div className="contract-title text-center font-bold text-4xl underline mb-0 mt-10"
            style={{ fontFamily: 'Frank Ruhl Libre, Noto Sans Hebrew, Arial, sans-serif', fontWeight: 700, fontSize: '2.25rem', textDecoration: 'underline', marginBottom: 0, marginTop: '2.5rem', letterSpacing: '0.01em', color: '#111', lineHeight: 1.1, direction: 'rtl' }}>
            הסכם שכירות למגורים
          </div>
          <div className="contract-subtitle text-center text-lg font-medium mb-3"
            style={{ fontFamily: 'Frank Ruhl Libre, Noto Sans Hebrew, Arial, sans-serif', fontWeight: 600, fontSize: '1.18rem', color: '#111', marginBottom: 18, marginTop: 0, letterSpacing: '0.01em', lineHeight: 1.2, direction: 'rtl' }}>
            (שכירות בלתי מוגנת)
          </div>
          <div className="contract-date-row text-center text-base mb-3"
            style={{ fontFamily: 'Frank Ruhl Libre, Noto Sans Hebrew, Arial, sans-serif', fontWeight: 400, fontSize: '1.05rem', color: '#111', marginBottom: 12, marginTop: 0, letterSpacing: '0.01em', lineHeight: 1.2, direction: 'rtl' }}>
            שנעשה ונחתם ב{meta?.includeAgreementDetails ? (meta?.agreementCity || '_______') : '_______'}, בתאריך {meta?.includeAgreementDetails ? formatDate(meta?.agreementDate) : '_______'}.
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {contract.split('\n').map((line, index) => {
              // Skip empty lines, separator lines, and any remaining conditional block artifacts
              if (!line.trim() || line.trim() === '⸻' || line.trim() === '-' || line.trim().startsWith('{{#if') || line.trim().startsWith('{{/if') || line.includes('<div><strong>-</strong></div>') || line.includes('<strong>-</strong>') || line.trim() === '<div><strong>-</strong></div>') return null;

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
                    style={{ marginBottom: '1em', color: '#111', direction: 'rtl' }}
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
                    style={{ color: '#111', direction: 'rtl' }}
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
                  style={{ marginBottom: '1em', color: '#111', direction: 'rtl' }}
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