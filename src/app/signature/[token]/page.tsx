'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from '@/components/SignatureCanvas';
import contractMerge from '@/utils/contractMerge';

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

interface SignaturePageProps {
  invitation: {
    id: string;
    contractId: string;
    signerEmail: string;
    signerName: string;
    signerType: 'landlord' | 'tenant' | 'guarantor';
    signerId: string;
    signerRole: string;
    status: string;
    expiresAt: Date;
  };
  contractData: any;
}

export default function SignaturePage() {
  const params = useParams();
  const token = params?.token as string;
  
  const [invitation, setInvitation] = useState<any>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [contract, setContract] = useState<string>('');
  const [meta, setMeta] = useState<ContractMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/signature/verify-token?token=${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid or expired invitation');
        }
        const data = await response.json();
        setInvitation(data.invitation);
        setContractData(data.contractData);
        
        // Generate contract text with exact same logic as ContractPreviewPage
        if (data.contractData) {
          try {
            const templateResponse = await fetch('/data/master-template.txt');
            if (!templateResponse.ok) {
              throw new Error(`Template fetch failed: ${templateResponse.status}`);
            }
            
            const template = await templateResponse.text();
            
            // Get data from contract data (same logic as ContractPreviewPage)
            const rawData = data.contractData.answers || data.contractData;
            let contractDataProcessed: ContractMeta = {};
            try {
              // Flatten all keys from rawData, landlords[0], and tenants[0]
              contractDataProcessed = {
                ...rawData,
                ...(Array.isArray(rawData.landlords) && rawData.landlords[0] ? rawData.landlords[0] : {}),
                ...(Array.isArray(rawData.tenants) && rawData.tenants[0] ? rawData.tenants[0] : {}),
              };
              setMeta(contractDataProcessed);
            } catch (error) {
              console.error('Error parsing contract data:', error);
              setMeta(null);
            }

            // Merge template with data
            let mergedContract = contractMerge(template, contractDataProcessed);

            // Remove conditional blocks (same logic as ContractPreviewPage)
            mergedContract = mergedContract.replace(/{{#if [^}]+}}([\s\S]*?){{\/if}}/g, (m, content) => {
              // Check if the condition is met
              const match = m.match(/{{#if \(eq ([^)]+) "([^"]+)"\)}}/);
              if (match) {
                const key = match[1].trim();
                const expectedValue = match[2].trim();
                if (contractDataProcessed[key] === expectedValue) {
                  return content.trim();
                }
                return '';
              }
              
              // Fallback for simple conditions
              const simpleMatch = m.match(/{{#if ([^}]+)}}/);
              if (simpleMatch) {
                const key = simpleMatch[1].trim();
                if (contractDataProcessed[key]) return content.trim();
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

            // Apply bold formatting to match contract generation
            mergedContract = mergedContract
              // Add bold to main section numbers AND titles (e.g., "1. פרטי המושכר", "2. תקופת השכירות", etc.)
              .replace(/^(\d+\.\s*)([^0-9\n]+?)(?=\n|$)/gm, '<strong class="main-section-title" style="font-size: 1.2em; font-weight: 700;">$1$2</strong>')
              // Add bold to subsection numbers (e.g., 1.1, 1.2, etc.)
              .replace(/^(\d+\.\d+)(?!<)/gm, '<strong class="subsection-number">$1</strong>')
              // Add bold to "המושכר" in quotes
              .replace(/"המושכר"/g, '<strong>"המושכר"</strong>')
              // Add bold to "המשכיר" in quotes
              .replace(/"המשכיר"/g, '<strong>"המשכיר"</strong>')
              // Add bold to "השוכר" in quotes
              .replace(/"השוכר"/g, '<strong>"השוכר"</strong>')
              // Add bold to key terms
              .replace(/בין:/g, '<strong>בין:</strong>')
              .replace(/המשכיר:/g, '<strong>המשכיר:</strong>')
              .replace(/\(להלן: "המשכיר"\)/g, '(להלן: <strong>"המשכיר"</strong>)')
              .replace(/לבין:/g, '\n\n<strong>לבין:</strong>')
              .replace(/השוכר :/g, '<strong>השוכר :</strong>')
              .replace(/השוכר:/g, '<strong>השוכר:</strong>')
              .replace(/\(להלן: "השוכר"\)/g, '(להלן: <strong>"השוכר"</strong>)')
              .replace(/והואיל/g, '<strong>והואיל</strong>')
              .replace(/^הואיל/g, '<strong>הואיל</strong>');

            // Add page break for "נספח: כתב ערבות" section
            mergedContract = mergedContract.replace(
              /(16\.\s*נספח: כתב ערבות)/g,
              '<div class="page-break-appendix" style="page-break-before: always;"></div>$1'
            );

            // Additional cleanup: Remove garden maintenance clause if not selected
            if (contractDataProcessed.gardenMaintenance !== "כן, ברצוני שהשוכר יהיה אחראי על תחזוקת הגינה") {
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

              // For section 15 (signatures), preserve the signature placeholders from template
              const signatureLines = rawData.tenants.map((tenant: any, idx: number) => {
                const name = tenant.tenantName || '-';
                const id = tenant.tenantIdNumber || '-';
                return `
<div class="signature-block">
<strong>שוכר ${idx + 1}</strong>: <span class="signature-placeholder">שוכר ${idx + 1}</span>
שם: <strong>${name}</strong> | ת"ז: <strong>${id}</strong>
</div>`;
              }).join('\n');

              // Replace the signature section
              const signatureSection = `15. חתימות

<div class="signature-header">ולראיה באו הצדדים על החתום</div>

<div class="signature-block">
<strong>המשכיר</strong>: <span class="signature-placeholder">המשכיר</span>
שם: <strong>${contractDataProcessed.landlordName}</strong> | ת"ז: <strong>${contractDataProcessed.landlordId}</strong>
</div>

${signatureLines}`;

              // Find and replace the entire section 15 using regex to handle formatting
              const section15Regex = /<strong[^>]*>15\.<\/strong>\s*חתימות|15\.\s*חתימות/;
              const section15Match = mergedContract.match(section15Regex);
              
              if (section15Match) {
                const section15Start = section15Match.index!;
                
                // Find the end by looking for the next ⸻ (section separator)
                const nextSectionStart = mergedContract.indexOf('⸻', section15Start + 50);
                
                if (nextSectionStart !== -1) {
                  mergedContract = 
                    mergedContract.substring(0, section15Start) +
                    signatureSection +
                    '\n\n' +
                    mergedContract.substring(nextSectionStart);
                } else {
                  // If no next section found, replace until end
                  mergedContract = 
                    mergedContract.substring(0, section15Start) +
                    signatureSection;
                }
              }
            }

            // Clean up any remaining empty signature divs (from contract generation)
            mergedContract = mergedContract
              .replace(/<div style="display: inline-block; min-width: 200px; text-align: center; margin: 10px 0; min-height: 80px;"><div style="height: 60px; margin-bottom: 10px;"><\/div><\/div>/g, '')
              .replace(/<div style="display: inline-block; min-width: 200px; text-align: center; margin: 10px 0;"><div style="height: 60px; margin-bottom: 10px;"><\/div><\/div>/g, '');
            
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
          } catch (templateError) {
            console.error('Error in template processing:', templateError);
            setError(`שגיאה בטעינת תבנית החוזה: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const handleSubmit = async () => {
    if (!signature || !termsAccepted) {
      setError('נא לחתום ולאשר את קריאת החוזה');
      return;
    }

    setSubmitting(true);
    setError('');
    
    try {
      const ipAddress = await getClientIP();
      const response = await fetch('/api/signature/save-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature,
          ipAddress,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save signature');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38E18E] mx-auto"></div>
          <p className="mt-4 text-gray-600" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            טוען...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            שגיאה
          </h2>
          <p className="text-gray-600 mb-6" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            {error}
          </p>
          <button
            onClick={() => window.close()}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
          >
            סגור
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            החוזה נחתם בהצלחה!
          </h2>
          <p className="text-gray-600 mb-6" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            תודה על החתימה. תקבל עותק של החוזה החתום למייל שלך בקרוב.
          </p>
          <button
            onClick={() => window.close()}
            className="px-6 py-2 bg-[#38E18E] text-[#281D57] rounded-lg hover:bg-[#2bc77a] transition-colors font-semibold"
            style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
          >
            סגור
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen flex flex-col items-center bg-white text-gray-900" style={{ fontFamily: 'var(--contract-font)' }} dir="rtl">
        {/* Sticky Header with Preview Title and Sign Button */}
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
              onClick={() => window.close()}
              className="text-gray-500 hover:text-gray-700 transition-colors text-sm flex items-center gap-1 cursor-pointer"
              style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>סגור</span>
            </button>
          </div>
          
          {/* Main Header Content */}
          <div className="flex items-center justify-between w-full">
            <div className="text-lg font-bold" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              חתום על הסכם השכירות
            </div>
            <div className="flex gap-2">
              <button
                className="bg-[#38E18E] text-[#281D57] font-bold px-4 py-1.5 rounded-lg shadow hover:bg-[#2bc77a] transition-colors flex items-center justify-center min-w-[100px] text-sm"
                onClick={() => setShowSignatureModal(true)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                חתום על החוזה
              </button>
            </div>
          </div>
        </header>

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
            חוזה זה נחתם באמצעים דיגיטליים בהתאם לחוק חתימה אלקטרונית, התשס"א–2001.
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {contract.split('\n').map((line, index) => {
              // Skip empty lines, separator lines, and any remaining conditional block artifacts
              if (!line.trim() || line.trim() === '⸻' || line.trim() === '-' || line.trim().startsWith('{{#if') || line.trim().startsWith('{{/if') || line.includes('<div><strong>-</strong></div>') || line.includes('<strong>-</strong>') || line.trim() === '<div><strong>-</strong></div>') return null;

              // Section 5.1 and 5.3 are now handled correctly by contractMerge function

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

        {/* Signature Modal */}
        {showSignatureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[2000] p-4 md:p-4 p-0" 
               style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            <div className="bg-white rounded-lg md:rounded-lg rounded-none shadow-xl max-w-2xl w-full max-h-[90vh] md:max-h-[90vh] h-full md:h-auto overflow-y-auto relative p-8 md:p-8 p-4" 
                 style={{ 
                   minWidth: 'auto',
                   fontFamily: 'Noto Sans Hebrew, Arial, sans-serif'
                 }}>
              {/* Close Button */}
              <button
                onClick={() => setShowSignatureModal(false)}
                className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full bg-transparent border-none text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                style={{
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                ×
              </button>

              {/* Modal Title */}
              <h2 className="md:text-xl text-lg font-bold text-center mb-6" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                חתימה על הסכם השכירות
              </h2>

              {/* Agreement Checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1"
                    style={{ accentColor: '#38E18E' }}
                  />
                  <span className="text-sm text-gray-700" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    אני מאשר/ת כי עיינתי בחוזה, הבנתי את תנאיו ואני מסכים/ה להם. חתימתי האלקטרונית מחייבת אותי בהתאם לחוק חתימה אלקטרונית, תשס"א-2001.
                  </span>
                </label>
              </div>

              {/* Signature Canvas */}
              <div className="mb-6">
                <SignatureCanvas 
                  onSignatureChange={setSignature} 
                  width={400} 
                  height={150}
                  className="w-full max-w-full"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    {error}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex md:flex-row flex-col gap-3 md:justify-end justify-stretch">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                >
                  ביטול
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!signature || !termsAccepted || submitting}
                  className="px-6 py-2 bg-[#38E18E] text-[#281D57] font-bold rounded-lg shadow hover:bg-[#2bc77a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                >
                  {submitting ? 'שומר חתימה...' : 'אשר חתימה'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
} 