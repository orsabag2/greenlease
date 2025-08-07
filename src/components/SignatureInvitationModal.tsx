'use client';
import React, { useState, useEffect } from 'react';
import { SignatureStatus } from '@/types/signature';
import SignatureCanvas from './SignatureCanvas';

interface SignatureInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractData: any;
  onSendInvitations: (signers: SignatureStatus[]) => Promise<void>;
}

const SignatureInvitationModal: React.FC<SignatureInvitationModalProps> = ({
  isOpen,
  onClose,
  contractId,
  contractData,
  onSendInvitations
}) => {
  const [signers, setSigners] = useState<SignatureStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSigner, setCurrentSigner] = useState<SignatureStatus | null>(null);
  const [signature, setSignature] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signing, setSigning] = useState(false);

  // Initialize signers from contract data (fallback)
  const initializeSignersFromContractData = () => {
    if (!contractData) {
      console.log('No contract data available');
      return;
    }
    
    console.log('Initializing signers from contract data:', contractData);
    
    const initialSigners: SignatureStatus[] = [];

    // Add landlord - check both array and direct properties
    if (contractData.landlords && contractData.landlords.length > 0) {
      contractData.landlords.forEach((landlord: any) => {
        initialSigners.push({
          role: 'המשכיר',
          name: landlord.landlordName || '',
          status: 'not_sent',
          email: landlord.landlordEmail || '',
          signerType: 'landlord',
          signerId: landlord.landlordId || '',
        });
      });
    } else if (contractData.landlordName) {
      initialSigners.push({
        role: 'המשכיר',
        name: contractData.landlordName,
        status: 'not_sent',
        email: contractData.landlordEmail || '',
        signerType: 'landlord',
        signerId: contractData.landlordId || '',
      });
    }

    // Add tenants - check both array and direct properties
    if (contractData.tenants && contractData.tenants.length > 0) {
      contractData.tenants.forEach((tenant: any) => {
        initialSigners.push({
          role: 'השוכר',
          name: tenant.tenantName || '',
          status: 'not_sent',
          email: tenant.tenantEmail || '',
          signerType: 'tenant',
          signerId: tenant.tenantIdNumber || '',
        });
      });
    } else if (contractData.tenantName) {
      initialSigners.push({
        role: 'השוכר',
        name: contractData.tenantName,
        status: 'not_sent',
        email: contractData.tenantEmail || '',
        signerType: 'tenant',
        signerId: contractData.tenantIdNumber || '',
      });
    }

    // Add guarantors - check both array and direct properties
    if (contractData.guarantorsCount && contractData.guarantorsCount > 0) {
      for (let i = 1; i <= contractData.guarantorsCount; i++) {
        const guarantorName = contractData[`guarantor${i}Name`];
        const guarantorId = contractData[`guarantor${i}Id`];
        const guarantorEmail = contractData[`guarantor${i}Email`];
        
        if (guarantorName) {
          initialSigners.push({
            role: i === 1 ? 'ערב ראשון' : 'ערב שני',
            name: guarantorName,
            status: 'not_sent',
            email: guarantorEmail || '',
            signerType: 'guarantor',
            signerId: guarantorId || '',
          });
        }
      }
    }

    // Debug: Log what we found
    console.log('Landlords found:', contractData.landlords);
    console.log('Tenants found:', contractData.tenants);
    console.log('Guarantors count:', contractData.guarantorsCount);
    console.log('Guarantor1Name:', contractData.guarantor1Name);
    console.log('Guarantor2Name:', contractData.guarantor2Name);
    console.log('LandlordName:', contractData.landlordName);
    console.log('TenantName:', contractData.tenantName);
    console.log('LandlordId:', contractData.landlordId);
    console.log('TenantIdNumber:', contractData.tenantIdNumber);

    console.log('Created signers:', initialSigners);
    
    // If no signers found, create some test signers
    if (initialSigners.length === 0) {
      console.log('No signers found, creating test signers');
      initialSigners.push({
        role: 'המשכיר',
        name: 'אור סבג',
        status: 'not_sent',
        email: '',
        signerType: 'landlord',
        signerId: 'test-landlord',
      });
      initialSigners.push({
        role: 'השוכר',
        name: 'קמילה שופן',
        status: 'not_sent',
        email: '',
        signerType: 'tenant',
        signerId: 'test-tenant',
      });
    }
    
    return initialSigners;
  };

  // Fetch current signature statuses
  const fetchSignatureStatuses = async () => {
    console.log('fetchSignatureStatuses called');
    
    if (!contractId) {
      // Fallback to contract data if no contractId
      const fallbackSigners = initializeSignersFromContractData();
      if (fallbackSigners) {
        setSigners(fallbackSigners);
      }
      return;
    }
    
    setRefreshing(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/signature/status?contractId=${contractId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched signers:', data.signers);
        console.log('First signer details:', data.signers[0]);
        setSigners(data.signers);
      } else {
        console.log('API failed, using fallback data');
        // Fallback to contract data if API fails
        const fallbackSigners = initializeSignersFromContractData();
        if (fallbackSigners) {
          setSigners(fallbackSigners);
        }
      }
    } catch (error) {
      console.error('Error fetching signature statuses:', error);
      // Fallback to contract data if API fails
      const fallbackSigners = initializeSignersFromContractData();
      if (fallbackSigners) {
        setSigners(fallbackSigners);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize signers and fetch current statuses
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened with:', { contractId, contractData });
      console.log('Contract data type:', typeof contractData);
      console.log('Contract data keys:', contractData ? Object.keys(contractData) : 'none');
      fetchSignatureStatuses();
    }
  }, [isOpen, contractId, contractData]);

  // Auto-refresh when window gains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen) {
        console.log('Window focused, refreshing signature statuses');
        fetchSignatureStatuses();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen]);

  const updateSignerEmail = (index: number, email: string) => {
    const updatedSigners = [...signers];
    updatedSigners[index].email = email;
    setSigners(updatedSigners);
  };

  const saveEmailAddress = async (index: number) => {
    const signer = signers[index];
    if (!signer.email) return;

    setLoading(true);
    try {
      // Send invitation for this specific signer
      await onSendInvitations([signer]);
      
      // Update local state
      const updatedSigners = [...signers];
      updatedSigners[index].status = 'sent';
      setSigners(updatedSigners);
    } catch (error) {
      console.error('Error saving email address:', error);
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (index: number) => {
    const signer = signers[index];
    if (!signer.email) return;

    setLoading(true);
    try {
      await onSendInvitations([signer]);
      // Refresh statuses to get updated data
      await fetchSignatureStatuses();
    } catch (error) {
      console.error('Error resending invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSign = (index: number) => {
    const signer = signers[index];
    console.log('handleDirectSign called with index:', index);
    console.log('Selected signer:', signer);
    console.log('All signers:', signers);
    setCurrentSigner(signer);
    setShowSignatureModal(true);
  };

  const handleSignatureSubmit = async () => {
    if (!signature || !termsAccepted || !currentSigner) return;

    setSigning(true);
    try {
      console.log('handleSignatureSubmit - currentSigner:', currentSigner);
      console.log('handleSignatureSubmit - currentSigner.signerId:', currentSigner.signerId);
      console.log('handleSignatureSubmit - currentSigner.name:', currentSigner.name);
      
      const requestBody = {
        contractId,
        signerId: currentSigner.signerId,
        signerName: currentSigner.name,
        signerType: currentSigner.signerType,
        signature,
        ipAddress: 'direct-sign',
        userAgent: 'direct-sign'
      };
      
      console.log('Sending direct signature request:', requestBody);
      
      // Use the direct signature API
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/signature/direct-sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setShowSignatureModal(false);
        setSignature('');
        setTermsAccepted(false);
        setCurrentSigner(null);
        // Refresh the signers list
        await fetchSignatureStatuses();
      } else {
        const errorData = await response.json();
        console.error('Error saving signature:', errorData);
        alert(`שגיאה בשמירת החתימה: ${errorData.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error saving signature:', error);
    } finally {
      setSigning(false);
    }
  };

  const sendAllInvitations = async () => {
    const signersWithEmails = signers.filter(signer => signer.email && signer.status === 'not_sent' && signer.signerType !== 'landlord');
    if (signersWithEmails.length === 0) return;

    setSending(true);
    try {
      await onSendInvitations(signersWithEmails);
      // Refresh statuses to get updated data
      await fetchSignatureStatuses();
    } catch (error) {
      console.error('Error sending invitations:', error);
    } finally {
      setSending(false);
    }
  };

  const distributeSignedContract = async () => {
    setSending(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/signature/distribute-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          signers: signers.filter(signer => signer.email && signer.email !== 'direct-sign@greenlease.me')
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`החוזה החתום נשלח בהצלחה ל-${result.sentCount} צדדים!`);
        setShowSignatureModal(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to distribute contract');
      }
    } catch (error) {
      console.error('Error distributing contract:', error);
      alert('שגיאה בשליחת החוזה החתום: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const downloadSignedContract = async () => {
    setSending(true);
    try {
      console.log('Sending download request with:', { contractId, signers: signers.filter(signer => signer.status === 'signed') });
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/signature/download-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          signers: signers.filter(signer => signer.status === 'signed')
        })
      });

      console.log('Download response status:', response.status);
      console.log('Download response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const blob = await response.blob();
        console.log('Download blob size:', blob.size);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Check content type to determine file extension
        const contentType = response.headers.get('content-type');
        const isHtml = contentType && contentType.includes('text/html');
        const fileExtension = isHtml ? 'html' : 'pdf';
        const fileName = `contract_${contractId}.${fileExtension}`;
        
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert(`החוזה החתום הורד בהצלחה! (${fileExtension.toUpperCase()})`);
      } else {
        const errorText = await response.text();
        console.log('Download error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error downloading contract:', error);
      alert('שגיאה בהורדת החוזה החתום: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  // Check if all signers have signed
  const allSigned = signers.length > 0 && signers.every(signer => signer.status === 'signed');
  const hasSignedSigners = signers.some(signer => signer.status === 'signed');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'sent':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'signed':
        return 'נחתם!';
      case 'sent':
        return 'נשלח לחתימה';
      default:
        return 'לא נחתם';
    }
  };

  const getPropertyAddress = () => {
    if (!contractData) return '';
    const parts = [
      contractData.street,
      contractData.buildingNumber,
      contractData.propertyCity
    ].filter(Boolean);
    return parts.join(' ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-[#281D57]" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              חוזה השכירות מוכן לחתימה דיגיטלית
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSignatureStatuses}
                disabled={refreshing}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
              >
                {refreshing ? 'מעדכן...' : 'רענן'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

        {/* Content */}
        <div className="p-6">
          {/* Subtitle */}
          <p className="text-gray-600 mb-6" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            החוזה עבור {getPropertyAddress()} מוכן לחתימה והוזנו פרטי החותמים הבאים:
          </p>

          {/* Signers List - Redesigned to match the image */}
          <div className="mb-8 space-y-4">
            {signers.length === 0 && (
              <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                {refreshing ? 'טוען...' : (
                  <div>
                    <div>לא נמצאו חותמים</div>
                    <div className="text-xs mt-2">Debug: contractId={contractId}</div>
                    <div className="text-xs">contractData keys: {contractData ? Object.keys(contractData).join(', ') : 'none'}</div>
                  </div>
                )}
              </div>
            )}
            {signers.map((signer, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                {/* Role and Name (Right side) */}
                <div className="flex-1 text-right">
                  <div className="font-medium text-gray-900" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    {signer.role}: {signer.name}
                  </div>
                </div>

                {/* Email (Middle) */}
                <div className="flex items-center gap-2 mx-4 min-w-[200px]">
                  {signer.signerType === 'landlord' && signer.status === 'not_sent' ? (
                    // Landlord can sign directly
                    <button
                      onClick={() => handleDirectSign(index)}
                      disabled={loading}
                      className="px-4 py-2 bg-[#38E18E] text-[#281D57] rounded text-sm hover:bg-[#2bc77a] transition-colors font-semibold"
                      style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                    >
                      חתום עכשיו
                    </button>
                  ) : signer.status === 'not_sent' ? (
                    // Other signers need email
                    <>
                      <input
                        type="email"
                        value={signer.email}
                        onChange={(e) => updateSignerEmail(index, e.target.value)}
                        placeholder="הזן מייל"
                        className="px-3 py-2 border border-gray-300 rounded text-sm w-48"
                        style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                      />
                      <button
                        onClick={() => saveEmailAddress(index)}
                        disabled={!signer.email || loading}
                        className="px-4 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                        style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                      >
                        הוסיפו כתובת מייל
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-600 px-3 py-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                        {signer.email && signer.email !== 'direct-sign@greenlease.me' ? signer.email : ''}
                      </span>
                      {(signer.status === 'sent' || signer.status === 'not_sent') && signer.signerType !== 'landlord' && (
                        <button
                          onClick={() => resendInvitation(index)}
                          disabled={loading}
                          className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
                          style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                        >
                          שלח שוב
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Status (Left side) */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  {getStatusIcon(signer.status)}
                  <span className="text-sm font-medium" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    {getStatusText(signer.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Information Section */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-4" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              מה יקרה שתשלח את החוזה לחתימה דיגיטלית?
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                <span>•</span>
                <span>כל חותם יקבל מייל אישי עם קישור ייחודי וקוד אימות חד-פעמי.</span>
              </li>
              <li className="flex items-start gap-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                <span>•</span>
                <span>תוכל לעקוב אחר סטטוס החתימות בזמן-אמת בלוח המעקב.</span>
              </li>
              <li className="flex items-start gap-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                <span>•</span>
                <span>לאחר שכל הצדדים יחתמו, קובץ PDF חתום יישלח אוטומטית אליך ואליהם.</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {allSigned ? (
              // All signed - show distribute button
              <button
                onClick={distributeSignedContract}
                disabled={sending}
                className="px-8 py-3 bg-[#38E18E] text-[#281D57] rounded-lg font-semibold hover:bg-[#2bc77a] disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
              >
                {sending ? 'שולח...' : 'שלח את החוזה החתום לכל הצדדים'}
              </button>
            ) : (
              // Not all signed - show send invitations button
              <button
                onClick={sendAllInvitations}
                disabled={sending || signers.filter(s => s.email && s.status === 'not_sent' && s.signerType !== 'landlord').length === 0}
                className="px-8 py-3 bg-[#38E18E] text-[#281D57] rounded-lg font-semibold hover:bg-[#2bc77a] disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
              >
                {sending ? 'שולח...' : 'שלח את החוזה לחתימה דיגיטלית'}
              </button>
            )}
            
            {/* Debug download button - show when there are signed signers */}
            {hasSignedSigners && (
              <button
                onClick={downloadSignedContract}
                disabled={sending}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
              >
                {sending ? 'מוריד...' : 'הורד חוזה חתום (דיבאג)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal for Direct Signing */}
      {showSignatureModal && currentSigner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-[#281D57]" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                חתימה על הסכם השכירות
              </h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 mb-4" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                  {currentSigner.role}: {currentSigner.name}
                </p>
              </div>

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
                  onClick={handleSignatureSubmit}
                  disabled={!signature || !termsAccepted || signing}
                  className="px-6 py-2 bg-[#38E18E] text-[#281D57] font-bold rounded-lg shadow hover:bg-[#2bc77a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                >
                  {signing ? 'שומר חתימה...' : 'אשר חתימה'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureInvitationModal; 