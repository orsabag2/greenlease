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
  } catch (error) {
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
  [key: string]: any; // Allow any other properties
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
            // Flatten landlord and tenant data for contract compatibility
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

        // Merge template with data
        let mergedContract = contractMerge(template, data);

        // Handle multiple tenants if present
        if (Array.isArray(rawData.tenants) && rawData.tenants.length > 1) {
          const tenantLines = rawData.tenants.map((tenant: any, idx: number) => {
            const name = tenant.tenantName || '-';
            const id = tenant.tenantIdNumber || '-';
            const city = tenant.tenantCity || '-';
            const phone = tenant.tenantPhone || '-';
            return `${idx + 1}. <strong>השוכר :</strong> <strong>${name}</strong>, ת"ז <strong>${id}</strong>, עיר מגורים: <strong>${city}</strong>, טלפון: <strong>${phone}</strong>`;
          }).join('\n');
          
          mergedContract = mergedContract.replace(/השוכר: [^\n]+/g, tenantLines);
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

  return (
    <>
      <style jsx global>{`
        /* Base styles for both preview and print */
        .main-section {
          font-weight: 700 !important;
          font-size: 1.2em !important;
          margin-top: 1em !important;
          margin-bottom: 1em !important;
        }

        /* Contract parties section styling */
        .contract-party-section {
          margin: 1em 0;
          color: inherit;
          white-space: pre-line;
        }

        /* Remove restrictive line height and spacing */
        .contract-preview {
          line-height: 1.6 !important;
          white-space: pre-line !important;
        }
        
        .contract-preview p,
        .contract-preview div {
          margin: 0.3em 0;
          line-height: 1.6 !important;
        }

        /* Add proper spacing between sections */
        .contract-preview > div:not(:last-child) {
          margin-bottom: 0.5em;
        }

        /* Special spacing for main sections */
        .contract-preview div.main-section {
          margin-top: 1em;
          margin-bottom: 0.7em;
        }

        /* Ensure proper text wrapping */
        .contract-preview strong {
          white-space: nowrap;
        }

        @media print {
          header.print-hidden,
          div.print-spacer {
            display: none !important;
          }
          @page {
            margin: 2.5cm;
          }
          .contract-preview {
            padding: 0 !important;
            font-size: 11pt !important;
          }
          .contract-title {
            font-size: 16pt !important;
            margin-bottom: 8px !important;
          }
          .contract-subtitle {
            font-size: 13pt !important;
            margin-bottom: 8px !important;
          }
          .contract-date-row {
            font-size: 11pt !important;
            margin-bottom: 16px !important;
          }
        }
      `}</style>
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
          <div className="text-xl font-bold">תצוגה מקדימה של החוזה</div>
          <button
            className="bg-[#38E18E] text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-[#2bc77a] transition-colors"
            onClick={() => window.print()}
          >
            הדפס
          </button>
        </header>
        {/* Spacer to prevent content from being hidden under the sticky header */}
        <div className="print-spacer" style={{ height: 72 }} />
        
        {/* Contract Content */}
        <div className="contract-preview max-w-4xl mx-auto w-full px-8 whitespace-pre-wrap" style={{ lineHeight: 'initial' }}>
          {/* Contract Title and Header */}
          <div className="contract-title text-center font-bold text-4xl underline mb-0 mt-10">
            הסכם שכירות למגורים
          </div>
          <div className="contract-subtitle text-center text-lg text-gray-800 mb-3 font-medium">
            (שכירות בלתי מוגנת)
          </div>
          <div className="contract-date-row text-center text-base text-gray-800 mb-3">
            שנעשה ונחתם ב{meta?.includeAgreementDetails ? (meta?.agreementCity || '_______') : '_______'}, בתאריך {meta?.includeAgreementDetails ? formatDate(meta?.agreementDate) : '_______'}.
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {contract.split('\n').map((line, index) => {
              // Skip empty lines and separator lines
              if (!line.trim() || line.trim() === '⸻') return null;
              
              // Check if the line starts with a number pattern (main sections or subsections)
              const isMainSection = /^\d+\.(?!\d)/.test(line.trim());
              const isSubSection = /^\d+\.\d+/.test(line.trim());

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
                <div key={index} className={isMainSection ? 'main-section' : ''} style={{ marginBottom: '1em' }}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
} 