'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from '@/components/SignatureCanvas';
import contractMerge from '@/utils/contractMerge';

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
  const token = params.token as string;
  
  const [invitation, setInvitation] = useState<any>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [contractText, setContractText] = useState<string>('');
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
        
        // Generate contract text
        if (data.contractData) {
                      // Load template and merge with contract data
            try {
              console.log('Starting template loading...');
              const templateResponse = await fetch('/data/master-template.txt');
              console.log('Template response status:', templateResponse.status);
              
              if (!templateResponse.ok) {
                throw new Error(`Template fetch failed: ${templateResponse.status}`);
              }
              
              const template = await templateResponse.text();
              console.log('Template loaded, length:', template.length);
              console.log('Template first 100 chars:', template.substring(0, 100));
              
              // Prepare data for contractMerge (similar to ContractPreviewPage)
              const rawData = data.contractData.answers || data.contractData;
              console.log('Signature page - rawData:', rawData);
              
              const contractData = {
                ...rawData,
                ...(Array.isArray(rawData.landlords) && rawData.landlords[0] ? rawData.landlords[0] : {}),
                ...(Array.isArray(rawData.tenants) && rawData.tenants[0] ? rawData.tenants[0] : {}),
              };
              console.log('Signature page - contractData:', contractData);
              console.log('About to call contractMerge...');
              
              const mergedContract = contractMerge(template, contractData);
              console.log('ContractMerge completed, length:', mergedContract.length);
              setContractText(mergedContract);
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
            שנעשה ונחתם ב_______, בתאריך _______.
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {contractText.split('\n').map((line, index) => {
              // Skip empty lines, separator lines, and any remaining conditional block artifacts
              if (!line.trim() || line.trim() === '⸻' || line.trim() === '-' || line.trim().startsWith('{{#if') || line.trim().startsWith('{{/if') || line.includes('<div><strong>-</strong></div>') || line.includes('<strong>-</strong>') || line.trim() === '<div><strong>-</strong></div>') return null;

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

              // Main sections get bold numbers
              if (isMainSection) {
                return (
                  <div key={index} dangerouslySetInnerHTML={{
                    __html: line
                      .replace(/^(\d+\.)(?!\d)/, '<strong>$1</strong>')
                      .replace(/"המושכר"/g, '<strong>"המושכר"</strong>')
                  }} />
                );
              }

              // Regular lines
              return (
                <div key={index} dangerouslySetInnerHTML={{
                  __html: line.replace(/"המושכר"/g, '<strong>"המושכר"</strong>')
                }} />
              );
            })}
          </div>
        </div>

        {/* Signature Modal */}
        {showSignatureModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.25)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
          }}>
            <div style={{ 
              background: '#fff', 
              borderRadius: 12, 
              padding: 32, 
              minWidth: 500, 
              maxWidth: 600,
              boxShadow: '0 2px 16px rgba(0,0,0,0.12)', 
              fontFamily: 'Noto Sans Hebrew, Arial, sans-serif', 
              position: 'relative' 
            }}>
              {/* Close Button */}
              <button
                onClick={() => setShowSignatureModal(false)}
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

              {/* Modal Title */}
              <h2 className="text-xl font-bold text-center mb-6" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
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
                    style={{ accentColor: '#8B5CF6' }}
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
                  className="w-full"
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
              <div className="flex gap-3 justify-end">
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