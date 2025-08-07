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
          const mergedContract = contractMerge(data.contractData.answers || data.contractData, data.contractData.answers || data.contractData);
          setContractText(mergedContract);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <img 
              src="/logo@2x.png" 
              alt="GreenLease" 
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-[#281D57] mb-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              חתימה דיגיטלית על החוזה
            </h1>
            <p className="text-gray-600" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              אנא קרא את החוזה בעיון לפני החתימה
            </p>
          </div>
          
          {/* Signer Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#281D57]" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              פרטי החותם:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>שם:</span>
                <span className="mr-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>{invitation.signerName}</span>
              </div>
              <div>
                <span className="font-medium" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>תעודת זהות:</span>
                <span className="mr-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>{invitation.signerId}</span>
              </div>
              <div>
                <span className="font-medium" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>תפקיד:</span>
                <span className="mr-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>{invitation.signerRole}</span>
              </div>
              <div>
                <span className="font-medium" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>מייל:</span>
                <span className="mr-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>{invitation.signerEmail}</span>
              </div>
            </div>
          </div>

          {/* Contract Preview */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#281D57]" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              החוזה:
            </h2>
            <div 
              className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto"
              style={{ fontFamily: 'Frank Ruhl Libre, Arial, sans-serif' }}
              dangerouslySetInnerHTML={{ __html: contractText }}
            />
          </div>

          {/* Signature Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[#281D57]" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              חתימה דיגיטלית:
            </h2>
            <SignatureCanvas onSignatureChange={setSignature} />
          </div>

          {/* Terms Acceptance */}
          <div className="mb-8">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                אני מאשר/ת שקראתי את החוזה בעיון ואני מסכים/ה לכל התנאים והתניות המפורטים בו. 
                אני מבין/ה שהחתימה הדיגיטלית שלי מהווה אישור מחייב לחוזה זה.
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!signature || !termsAccepted || submitting}
              className="px-8 py-3 bg-[#38E18E] text-[#281D57] font-bold rounded-lg shadow hover:bg-[#2bc77a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
            >
              {submitting ? 'שומר חתימה...' : 'חתום על החוזה'}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              החתימה הדיגיטלית מאובטחת ומאומתת. כל הפעולות נרשמות וניתן לעקוב אחריהן.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 