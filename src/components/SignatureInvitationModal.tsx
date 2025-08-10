'use client';
import React, { useState, useEffect } from 'react';
import { SignatureStatus } from '@/types/signature';
import SignatureCanvas from './SignatureCanvas';
import contractMerge from '@/utils/contractMerge';
import dynamic from 'next/dynamic';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

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
  const [infoExpanded, setInfoExpanded] = useState(false);


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
      contractData.landlords.forEach((landlord: any, index: number) => {
        // Generate signerId using same logic as status API
        const signerId = landlord.landlordId || `landlord-${index}-${landlord.landlordName || 'unknown'}`;
        
        initialSigners.push({
          role: 'המשכיר',
          name: landlord.landlordName || '',
          status: 'not_sent',
          email: landlord.landlordEmail || '',
          signerType: 'landlord',
          signerId: signerId,
        });
      });
    } else if (contractData.landlordName) {
      // Generate signerId using same logic as status API
      const signerId = contractData.landlordId || `landlord-single-${contractData.landlordName}`;
      
      initialSigners.push({
        role: 'המשכיר',
        name: contractData.landlordName,
        status: 'not_sent',
        email: contractData.landlordEmail || '',
        signerType: 'landlord',
        signerId: signerId,
      });
    }

    // Add tenants - check both array and direct properties
    if (contractData.tenants && contractData.tenants.length > 0) {
      contractData.tenants.forEach((tenant: any, index: number) => {
        // Generate signerId using same logic as status API
        const signerId = tenant.tenantIdNumber || `tenant-${index}-${tenant.tenantName || 'unknown'}`;
        
        initialSigners.push({
          role: contractData.tenants.length === 1 ? 'השוכר' : `שוכר ${index + 1}`,
          name: tenant.tenantName || '',
          status: 'not_sent',
          email: tenant.tenantEmail || '',
          signerType: 'tenant',
          signerId: signerId,
        });
      });
    } else if (contractData.tenantName) {
      // Generate signerId using same logic as status API
      const signerId = contractData.tenantIdNumber || `tenant-single-${contractData.tenantName}`;
      
      initialSigners.push({
        role: 'השוכר',
        name: contractData.tenantName,
        status: 'not_sent',
        email: contractData.tenantEmail || '',
        signerType: 'tenant',
        signerId: signerId,
      });
    }

    // Add guarantors - check both array and direct properties
    if (contractData.guarantorsCount && contractData.guarantorsCount > 0) {
      for (let i = 1; i <= contractData.guarantorsCount; i++) {
        const guarantorName = contractData[`guarantor${i}Name`];
        const guarantorId = contractData[`guarantor${i}Id`];
        const guarantorEmail = contractData[`guarantor${i}Email`];
        
        if (guarantorName) {
          // Generate signerId using same logic as status API
          const signerId = guarantorId || `guarantor-${i}-${guarantorName}`;
          
          initialSigners.push({
            role: i === 1 ? 'ערב ראשון' : 'ערב שני',
            name: guarantorName,
            status: 'not_sent',
            email: guarantorEmail || '',
            signerType: 'guarantor',
            signerId: signerId,
          });
        }
      }
    }

    console.log('Created signers:', initialSigners);
    
    if (initialSigners.length === 0) {
      console.log('No signers found, creating test signers');
      initialSigners.push({
        role: 'המשכיר',
        name: 'משכיר',
        status: 'not_sent',
        email: '',
        signerType: 'landlord',
        signerId: 'test-landlord',
      });
      initialSigners.push({
        role: 'השוכר',
        name: 'שוכר',
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
      const fallbackSigners = initializeSignersFromContractData();
      if (fallbackSigners) {
        setSigners(fallbackSigners);
      }
      return;
    }
    
    setRefreshing(true);
    try {
      const response = await fetch(`/api/signature/status?contractId=${contractId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched signers from API:', data.signers);
        console.log('Signers with status:', data.signers.map((s: any) => ({ 
          name: s.name, 
          signerId: s.signerId, 
          signerType: s.signerType, 
          status: s.status,
          email: s.email
        })));
        setSigners(data.signers);
      } else {
        console.log('API failed, using fallback data');
        const fallbackSigners = initializeSignersFromContractData();
        if (fallbackSigners) {
          setSigners(fallbackSigners);
        }
      }
    } catch (error) {
      console.error('Error fetching signature statuses:', error);
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
      fetchSignatureStatuses();
    }
  }, [isOpen, contractId, contractData]);

  // Auto-refresh when window gains focus
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



  const sendInvitation = async (index: number) => {
    const signer = signers[index];
    if (!signer.email) return;

    setLoading(true);
    try {
      await onSendInvitations([signer]);
      
      const updatedSigners = [...signers];
      updatedSigners[index].status = 'sent';
      setSigners(updatedSigners);
      
      // Success message is handled by the parent component
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('שגיאה בשליחת ההזמנה');
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
      await fetchSignatureStatuses();
      
      // Success message is handled by the parent component
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('שגיאה בשליחת ההזמנה שוב');
    } finally {
      setLoading(false);
    }
  };



  const handleDirectSign = (index: number) => {
    const signer = signers[index];
    console.log('handleDirectSign called with index:', index);
    console.log('Selected signer for direct sign:', {
      name: signer.name,
      signerId: signer.signerId,
      signerType: signer.signerType,
      role: signer.role
    });
    setCurrentSigner(signer);
    setShowSignatureModal(true);
  };

  const handleSignatureSubmit = async () => {
    if (!signature || !termsAccepted || !currentSigner) return;

    if (!currentSigner.name || currentSigner.name.trim() === '') {
      alert('שגיאה: שם החותם חסר. אנא מלא את פרטי החותם לפני החתימה.');
      return;
    }

    setSigning(true);
    try {
      const requestBody = {
        contractId,
        signerId: currentSigner.signerId,
        signerName: currentSigner.name.trim(),
        signerType: currentSigner.signerType,
        signerRole: currentSigner.role,
        signature,
        ipAddress: 'direct-sign',
        userAgent: 'direct-sign'
      };
      
      console.log('Sending direct sign request:', requestBody);
      
      const response = await fetch(`/api/signature/direct-sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Direct sign successful:', result);
        
        setShowSignatureModal(false);
        setSignature('');
        setTermsAccepted(false);
        setCurrentSigner(null);
        
        // Add a small delay to ensure Firestore write is complete
        setTimeout(async () => {
          console.log('Refreshing signature statuses after direct sign...');
          await fetchSignatureStatuses();
        }, 1000);
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
    const signersWithEmails = signers.filter(signer => 
      signer.email && 
      signer.email !== 'direct-sign@greenlease.me' && 
      signer.status === 'not_sent' && 
      signer.signerType !== 'landlord'
    );
    if (signersWithEmails.length === 0) {
      alert('לא נמצאו חותמים עם כתובות מייל מוכנות לשליחה');
      return;
    }

    setSending(true);
    try {
      await onSendInvitations(signersWithEmails);
      
      // Update status of sent signers
      const updatedSigners = [...signers];
      signersWithEmails.forEach(signer => {
        const index = updatedSigners.findIndex(s => s.signerId === signer.signerId);
        if (index !== -1) {
          updatedSigners[index].status = 'sent';
        }
      });
      setSigners(updatedSigners);
      
      // Success message is handled by the parent component
      await fetchSignatureStatuses();
    } catch (error) {
      console.error('Error sending invitations:', error);
      alert('שגיאה בשליחת ההזמנות');
    } finally {
      setSending(false);
    }
  };

  const sendSignedContractByEmail = async () => {
    setSending(true);
    try {
      // Get the contract HTML and CSS (same approach as send-pdf)
      const contractNode = document.querySelector('.contract-preview');
      if (!contractNode) {
        alert('לא נמצא תוכן החוזה לשליחה');
        return;
      }

      // Get all CSS styles
      let css = '';
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          css += Array.from(sheet.cssRules).map(rule => rule.cssText).join(' ');
        } catch (e) { /* ignore CORS issues */ }
      }

      // Get the HTML and process signatures (same as downloadSignedContract)
      let html = contractNode.outerHTML;
      
      // Add page break for section 16 (like in print version)
      html = html.replace(
        /(16\.\s*נספח: כתב ערבות)/g,
        '<div style="page-break-before: always;"></div>$1'
      );

      // Check if we need to manually generate the signature section for multiple tenants
      const allTenantSigners = signers.filter(signer => signer.signerType === 'tenant');
      const hasMultipleTenants = allTenantSigners.length > 1;
      
      if (hasMultipleTenants) {
        console.log('Multiple tenants detected, manually generating signature section');
        
        // Get contract data from localStorage
        const metaStr = localStorage.getItem('contractMeta');
        if (metaStr) {
          const rawData = JSON.parse(metaStr);
          
          // Generate signature section for multiple tenants
          const signatureLines = allTenantSigners.map((tenantSigner, idx) => {
            const tenantData = rawData.tenants && rawData.tenants[idx] ? rawData.tenants[idx] : {};
            const name = tenantData.tenantName || tenantSigner.name || '-';
            const id = tenantData.tenantIdNumber || tenantSigner.signerId || '-';
            return `
<div class="signature-block">
<strong>שוכר ${idx + 1}</strong>: <span class="signature-placeholder">שוכר ${idx + 1}</span>
שם: <strong>${name}</strong> | ת"ז: <strong>${id}</strong>
</div>`;
          }).join('\n');

          // Add guarantor signature lines if they exist
          let guarantorSignatureLines = '';
          if (rawData.guarantorsCount && rawData.guarantorsCount > 0) {
            for (let i = 1; i <= rawData.guarantorsCount; i++) {
              const guarantorName = rawData[`guarantor${i}Name`];
              const guarantorId = rawData[`guarantor${i}Id`];
              
              if (guarantorName) {
                const guarantorRole = i === 1 ? 'ערב ראשון' : 'ערב שני';
                guarantorSignatureLines += `
<div class="signature-block">
<strong>${guarantorRole}</strong>: <span class="signature-placeholder">${guarantorRole}</span>
שם: <strong>${guarantorName}</strong> | ת"ז: <strong>${guarantorId}</strong>
</div>`;
              }
            }
          }

          const signatureSection = `15. חתימות

<div class="signature-header">ולראיה באו הצדדים על החתום</div>

<div class="signature-block">
<strong>המשכיר</strong>: <span class="signature-placeholder">המשכיר</span>
שם: <strong>${rawData.landlordName || rawData.landlords?.[0]?.landlordName || '-'}</strong> | ת"ז: <strong>${rawData.landlordId || rawData.landlords?.[0]?.landlordId || '-'}</strong>
</div>

${signatureLines}${guarantorSignatureLines}`;

          // Replace the entire signature section
          const section15Start = html.indexOf('15. חתימות');
          const section15End = html.indexOf('⸻\n\n16.');
          
          if (section15Start !== -1 && section15End !== -1) {
            html = 
              html.substring(0, section15Start) +
              signatureSection +
              html.substring(section15End);
            console.log('Signature section replaced for multiple tenants');
          }
        }
      }
      
      // Replace signature placeholders with actual signatures
      const signedSigners = signers.filter(signer => signer.status === 'signed' && signer.signatureImage);
      
      // Replace landlord signature
      const landlordSigner = signedSigners.find(signer => signer.signerType === 'landlord');
      if (landlordSigner && landlordSigner.signatureImage) {
        if (html.includes('<span class="signature-placeholder">המשכיר</span>')) {
          html = html.replace(
            /<span class="signature-placeholder">המשכיר<\/span>/g,
            `<img src="${landlordSigner.signatureImage}" alt="חתימת המשכיר" class="signature-image" style="max-width: 200px; max-height: 80px; border: none; display: block; margin: 0 auto;" />`
          );
        } else {
          // For multiple tenants, replace the empty div in the landlord signature section
          const landlordSignatureReplaced = html.replace(
            /<div style="display: inline-block; min-width: 200px; text-align: center; margin: 10px 0; min-height: 80px;">\s*<div style="height: 60px; margin-bottom: 10px;"><\/div>\s*<\/div>/g,
            `<img src="${landlordSigner.signatureImage}" alt="חתימת המשכיר" class="signature-image" style="max-width: 200px; max-height: 80px; border: none; display: block; margin: 0 auto;" />`
          );
          
          if (landlordSignatureReplaced !== html) {
            html = landlordSignatureReplaced;
            console.log('Landlord signature replaced successfully');
          }
        }
      }

      // Replace tenant signatures
      const tenantSigners = signedSigners.filter(signer => signer.signerType === 'tenant');
      
      tenantSigners.forEach((tenantSigner, index) => {
        const placeholderText = tenantSigner.role === 'השוכר' ? 'השוכר' : `שוכר ${index + 1}`;
        const regex = new RegExp(`<span class="signature-placeholder">${placeholderText}<\/span>`, 'g');
        html = html.replace(
          regex,
          `<img src="${tenantSigner.signatureImage}" alt="חתימת ${tenantSigner.name}" class="signature-image" style="max-width: 200px; max-height: 80px; border: none; display: block; margin: 0 auto;" />`
        );
      });

      // Replace guarantor signatures
      const guarantorSigners = signedSigners.filter(signer => signer.signerType === 'guarantor');
      guarantorSigners.forEach((guarantorSigner) => {
        const placeholderText = guarantorSigner.role;
        const regex = new RegExp(`<span class="signature-placeholder">${placeholderText}<\/span>`, 'g');
        html = html.replace(
          regex,
          `<img src="${guarantorSigner.signatureImage}" alt="חתימת ${guarantorSigner.name}" class="signature-image" style="max-width: 200px; max-height: 80px; border: none; display: block; margin: 0 auto;" />`
        );
      });

      console.log('Signatures processed. Final HTML contains signature images:', html.includes('signature-image'));

      console.log('Sending signed contract request with:', {
        contractId,
        signers: signers.map(signer => ({
          email: signer.email,
          name: signer.name,
          role: signer.role
        })),
        hasHtml: !!html,
        hasCss: !!css
      });

      const response = await fetch('/api/signature/distribute-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          signers: signers.map(signer => ({
            email: signer.email,
            name: signer.name,
            role: signer.role
          })),
          html,
          css,
          propertyAddress: getPropertyAddress()
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        alert(`החוזה החתום נשלח בהצלחה ל-${result.sentCount} נמענים!`);
      } else {
        let errorMessage = 'שגיאה בשליחת החוזה';
        let errorDetails = null;
        try {
          const errorData = await response.json();
          console.error('Server error response:', errorData);
          errorMessage = errorData.details || errorData.error || errorMessage;
          errorDetails = errorData;
        } catch (e) {
          // If response is not JSON, get text
          console.error('Could not parse error response as JSON:', e);
          errorMessage = 'שגיאת שרת - לא ניתן לקרוא את תשובת השרת';
        }
        
        // Log full error details for debugging
        console.error('Full error details:', {
          errorMessage,
          errorData: errorDetails
        });
        
        // Log the error data in a more readable format
        if (errorDetails) {
          console.error('Error message:', errorDetails.error);
          console.error('Error details:', errorDetails.details);
          if (errorDetails.stack) {
            console.error('Error stack:', errorDetails.stack);
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error sending signed contract:', error);
      let errorMessage = 'שגיאה בשליחת החוזה החתום';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch')) {
          errorMessage = 'שגיאת חיבור - נא לוודא שהשרת פועל ולנסות שוב';
        } else {
          errorMessage += ': ' + error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setSending(false);
    }
  };



  const downloadSignedContract = async () => {
    setSending(true);
    try {
      // Use the signed contract download API for better performance and consistency
      const downloadResponse = await fetch(`/api/signature/download-contract?contractId=${contractId}`, {
        method: 'GET'
      });
      
      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed_contract_${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        alert('החוזה החתום הורד בהצלחה!');
        return;
      }
      
      // Fallback to manual processing if API fails
      console.log('API failed, falling back to manual processing');
      
      // Get the contract preview element (same as contract preview page)
      const contractNode = document.querySelector('.contract-preview');
      if (!contractNode) {
        alert('לא נמצא תוכן החוזה להורדה');
        return;
      }

      // Get all CSS styles (same as contract preview page)
      let css = '';
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          css += Array.from(sheet.cssRules).map(rule => rule.cssText).join(' ');
        } catch (e) { /* ignore CORS issues */ }
      }

      // Get the HTML (same as contract preview page)
      let html = contractNode.outerHTML;
      
      // Add page break for section 16 (like in print version)
      html = html.replace(
        /(16\.\s*נספח: כתב ערבות)/g,
        '<div style="page-break-before: always;"></div>$1'
      );

      // Check if we need to manually generate the signature section for multiple tenants
      const allTenantSigners = signers.filter(signer => signer.signerType === 'tenant');
      const hasMultipleTenants = allTenantSigners.length > 1;
      
      if (hasMultipleTenants) {
        console.log('Multiple tenants detected, manually generating signature section');
        
        // Get contract data from localStorage
        const metaStr = localStorage.getItem('contractMeta');
        if (metaStr) {
          const rawData = JSON.parse(metaStr);
          
          // Generate signature section for multiple tenants
          const signatureLines = allTenantSigners.map((tenantSigner, idx) => {
            const tenantData = rawData.tenants && rawData.tenants[idx] ? rawData.tenants[idx] : {};
            const name = tenantData.tenantName || tenantSigner.name || '-';
            const id = tenantData.tenantIdNumber || tenantSigner.signerId || '-';
            return `
<div class="signature-block">
<strong>שוכר ${idx + 1}</strong>: <span class="signature-placeholder">שוכר ${idx + 1}</span>
שם: <strong>${name}</strong> | ת"ז: <strong>${id}</strong>
</div>`;
          }).join('\n');

          // Add guarantor signature lines if they exist
          let guarantorSignatureLines = '';
          if (rawData.guarantorsCount && rawData.guarantorsCount > 0) {
            for (let i = 1; i <= rawData.guarantorsCount; i++) {
              const guarantorName = rawData[`guarantor${i}Name`];
              const guarantorId = rawData[`guarantor${i}Id`];
              
              if (guarantorName) {
                const guarantorRole = i === 1 ? 'ערב ראשון' : 'ערב שני';
                guarantorSignatureLines += `
<div class="signature-block">
<strong>${guarantorRole}</strong>: <span class="signature-placeholder">${guarantorRole}</span>
שם: <strong>${guarantorName}</strong> | ת"ז: <strong>${guarantorId}</strong>
</div>`;
              }
            }
          }

          const signatureSection = `15. חתימות

<div class="signature-header">ולראיה באו הצדדים על החתום</div>

<div class="signature-block">
<strong>המשכיר</strong>: <span class="signature-placeholder">המשכיר</span>
שם: <strong>${rawData.landlordName || rawData.landlords?.[0]?.landlordName || '-'}</strong> | ת"ז: <strong>${rawData.landlordId || rawData.landlords?.[0]?.landlordId || '-'}</strong>
</div>

${signatureLines}${guarantorSignatureLines}`;

          // Replace the entire signature section
          const section15Start = html.indexOf('15. חתימות');
          const section15End = html.indexOf('⸻\n\n16.');
          
          if (section15Start !== -1 && section15End !== -1) {
            html = 
              html.substring(0, section15Start) +
              signatureSection +
              html.substring(section15End);
            console.log('Signature section replaced for multiple tenants');
          }
        }
      }
      
      // Replace signature placeholders with actual signatures
      const signedSigners = signers.filter(signer => signer.status === 'signed' && signer.signatureImage);
      
      // Debug: Check what signature placeholders exist in the HTML
      console.log('HTML contains landlord placeholder:', html.includes('<span class="signature-placeholder">המשכיר</span>'));
      console.log('HTML contains tenant placeholder:', html.includes('<span class="signature-placeholder">השוכר</span>'));
      console.log('HTML contains signature placeholders:', html.includes('signature-placeholder'));
      
      // Find all signature placeholders in the HTML
      const signaturePlaceholderMatches = html.match(/<span class="signature-placeholder">([^<]+)<\/span>/g);
      console.log('All signature placeholders found:', signaturePlaceholderMatches);
      
      // Check for specific tenant placeholders
      for (let i = 1; i <= 10; i++) {
        const placeholder = `<span class="signature-placeholder">שוכר ${i}</span>`;
        if (html.includes(placeholder)) {
          console.log(`Found placeholder: ${placeholder}`);
        }
      }
      
      // Show a sample of the HTML around the signature section
      const signatureSectionIndex = html.indexOf('15. חתימות');
      if (signatureSectionIndex !== -1) {
        const sampleStart = Math.max(0, signatureSectionIndex - 200);
        const sampleEnd = Math.min(html.length, signatureSectionIndex + 1000);
        console.log('HTML sample around signature section:', html.substring(sampleStart, sampleEnd));
      }
      
      // Check if the signature section contains tenant names
      console.log('HTML contains tenant names in signature section:', html.includes('שם: <strong>') && html.includes('ת"ז: <strong>'));
      console.log('HTML contains signature blocks:', html.includes('signature-block'));
      
      // Replace landlord signature
      const landlordSigner = signedSigners.find(signer => signer.signerType === 'landlord');
      if (landlordSigner && landlordSigner.signatureImage) {
        // For multiple tenants, the landlord signature section might not have a placeholder
        // Let's try to replace the empty div with the signature
        if (html.includes('<span class="signature-placeholder">המשכיר</span>')) {
          html = html.replace(
            /<span class="signature-placeholder">המשכיר<\/span>/g,
            `<img src="${landlordSigner.signatureImage}" alt="חתימת המשכיר" class="signature-image" style="max-width: 200px; max-height: 80px; border: none; display: block; margin: 0 auto;" />`
          );
        } else {
          // For multiple tenants, replace the empty div in the landlord signature section
          const landlordSignatureReplaced = html.replace(
            /<div style="display: inline-block; min-width: 200px; text-align: center; margin: 10px 0; min-height: 80px;">\s*<div style="height: 60px; margin-bottom: 10px;"><\/div>\s*<\/div>/g,
            `<img src="${landlordSigner.signatureImage}" alt="חתימת המשכיר" class="signature-image" style="max-width: 200px; max-height: 80px; border: none; display: block; margin: 0 auto;" />`
          );
          
          if (landlordSignatureReplaced === html) {
            console.log('Landlord signature replacement failed - no empty div found');
          } else {
            html = landlordSignatureReplaced;
            console.log('Landlord signature replaced successfully');
          }
        }
      }

      // Replace tenant signatures
      const tenantSigners = signedSigners.filter(signer => signer.signerType === 'tenant');
      console.log('Tenant signers to replace:', tenantSigners.map(s => ({ name: s.name, role: s.role, index: tenantSigners.indexOf(s) })));
      
      tenantSigners.forEach((tenantSigner, index) => {
        // For multiple tenants, the placeholder is "שוכר 1", "שוכר 2", etc.
        // For single tenant, the placeholder is "השוכר"
        const placeholderText = tenantSigner.role === 'השוכר' ? 'השוכר' : `שוכר ${index + 1}`;
        console.log(`Looking for tenant placeholder for ${tenantSigner.name}: "${placeholderText}"`);
        console.log('HTML contains this placeholder:', html.includes(`<span class="signature-placeholder">${placeholderText}</span>`));
        
        const regex = new RegExp(`<span class="signature-placeholder">${placeholderText}<\/span>`, 'g');
        const tenantSignatureReplaced = html.replace(
          regex,
          `<img src="${tenantSigner.signatureImage}" alt="חתימת ${tenantSigner.name}" class="signature-image" style="max-width: 200px; max-height: 80px; border: none; display: block; margin: 0 auto;" />`
        );
        
        if (tenantSignatureReplaced === html) {
          console.log(`Tenant signature replacement failed for ${tenantSigner.name} - placeholder "${placeholderText}" not found`);
        } else {
          html = tenantSignatureReplaced;
          console.log(`Tenant signature replaced successfully for ${tenantSigner.name}`);
        }
      });

      // Replace guarantor signatures
      const guarantorSigners = signedSigners.filter(signer => signer.signerType === 'guarantor');
      guarantorSigners.forEach((guarantorSigner) => {
        const placeholderText = guarantorSigner.role;
        const regex = new RegExp(`<span class="signature-placeholder">${placeholderText}<\/span>`, 'g');
        html = html.replace(
          regex,
          `<img src="${guarantorSigner.signatureImage}" alt="חתימת ${guarantorSigner.name}" class="signature-image" style="max-width: 200px; max-height: 80px; border: none; display: block; margin: 0 auto;" />`
        );
      });

      // Debug: Check if signatures were replaced
      console.log('Final HTML contains signature images:', html.includes('signature-image'));
      console.log('Final HTML contains signature placeholders:', html.includes('signature-placeholder'));

      // Use the exact same API as contract preview
      const pdfResponse = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, css }),
      });

      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed_contract_${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('החוזה החתום הורד בהצלחה!');
      } else {
        const errorText = await pdfResponse.text();
        throw new Error(`PDF generation failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error downloading contract:', error);
      alert('שגיאה בהורדת החוזה החתום: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

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

  // Check if all signers have signed
  const allSigned = signers.length > 0 && signers.every(signer => signer.status === 'signed');
  const hasSignedSigners = signers.some(signer => signer.status === 'signed');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 md:p-4 p-0">
      <div className="bg-white rounded-lg md:rounded-lg rounded-none shadow-xl max-w-4xl w-full max-h-[95vh] md:max-h-[95vh] h-full md:h-auto overflow-y-auto">
        {/* Confetti effect when all signatures are completed */}
        {allSigned && typeof window !== 'undefined' && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={250}
            recycle={false}
          />
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-6 md:p-6 p-4 border-b">
          <h2 className="md:text-2xl text-xl font-bold text-[#281D57]" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            {allSigned ? 'כל החתימות התקבלו!' : 'חוזה השכירות מוכן לחתימה דיגיטלית'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-6 p-4">
          {allSigned ? (
            /* Completion state with illustration */
            <div className="text-center mb-8">
              <div className="flex justify-center items-center mb-6">
                <img 
                  src="/login-illustation.png" 
                  alt="החוזה מוכן לשליחה" 
                  style={{
                    maxWidth: '300px',
                    height: 'auto',
                    borderRadius: '12px'
                  }}
                />
              </div>
              <p className="text-lg text-gray-800 mb-6 leading-relaxed" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                המסמך החתום מוכן לשליחה לכולם<br/>
                החוזה עבור {getPropertyAddress()} מוכן לשליחה
              </p>
            </div>
          ) : (
            /* Normal state subtitle */
            <p className="text-gray-600 mb-6" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              החוזה עבור {getPropertyAddress()} מוכן לחתימה והוזנו פרטי החותמים הבאים:
            </p>
          )}

          {/* Signers List */}
          <div className="mb-8 space-y-4">
            {signers.length === 0 && (
              <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                {refreshing ? 'טוען...' : 'לא נמצאו חותמים'}
              </div>
            )}
            {signers.map((signer, index) => (
              <div key={index} className="flex md:flex-row flex-col md:items-center items-start justify-between p-4 border border-gray-200 rounded-lg gap-4 md:gap-0">
                {/* Role and Name (Right side) */}
                <div className="flex-1 text-right">
                  <div className="font-medium text-gray-900" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    {signer.role}: {signer.name}
                  </div>
                </div>

                {/* Email (Middle) */}
                <div className="flex items-center gap-2 md:mx-4 mx-0 md:min-w-[300px] min-w-0 w-full md:w-auto">
                  {signer.signerType === 'landlord' && signer.status === 'not_sent' ? (
                    <button
                      onClick={() => handleDirectSign(index)}
                      disabled={loading}
                      className="px-4 py-2 bg-[#38E18E] text-[#281D57] rounded text-sm hover:bg-[#2bc77a] transition-colors font-semibold"
                      style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                    >
                      חתום עכשיו
                    </button>
                  ) : signer.email === 'direct-sign@greenlease.me' ? (
                    /* Direct sign indicator */
                    <span className="text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                      חתם ישירות
                    </span>
                  ) : (
                    /* Simple email input with send invite button */
                    <>
                      <input
                        type="email"
                        value={signer.email || ''}
                        onChange={(e) => updateSignerEmail(index, e.target.value)}
                        placeholder={allSigned ? "לא ניתן לערוך - הכל חתום" : "הזן מייל"}
                        disabled={allSigned}
                        className={`px-3 py-2 border border-gray-300 rounded text-sm md:w-48 w-full ${allSigned ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                      />
                      {!allSigned && signer.email && (
                        <>
                          {signer.status === 'not_sent' ? (
                            <button
                              onClick={() => sendInvitation(index)}
                              disabled={loading}
                              className="px-3 py-1 bg-[#38E18E] text-[#281D57] rounded text-sm hover:bg-[#2bc77a] transition-colors font-semibold"
                              style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                            >
                              שלח הזמנה
                            </button>
                          ) : signer.status === 'sent' && (
                            <button
                              onClick={() => resendInvitation(index)}
                              disabled={loading}
                              className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                              style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                            >
                              שלח שוב
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Status (Left side) */}
                <div className="flex items-center gap-2 md:min-w-[120px] min-w-0 md:justify-start justify-center">
                  {getStatusIcon(signer.status)}
                  <span className="text-sm font-medium" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    {getStatusText(signer.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Information Section - Collapsible - Hide when all signed */}
          {!allSigned && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <button
              onClick={() => setInfoExpanded(!infoExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                מה יקרה שתשלח את החוזה לחתימה דיגיטלית?
              </h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${infoExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {infoExpanded && (
              <div className="mt-4">
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-sm text-gray-700" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    <span className="font-medium text-gray-900">שליחת הזמנות אישיות</span>
                    <span className="block text-gray-600 mt-1">כל חותם יקבל מייל אישי עם קישור ייחודי מאובטח לחתימה דיגיטלית.</span>
                  </li>
                  
                  <li className="text-sm text-gray-700" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    <span className="font-medium text-gray-900">מעקב בזמן אמת</span>
                    <span className="block text-gray-600 mt-1">תוכל לעקוב אחר סטטוס החתימות בזמן-אמת ולראות מי כבר חתם ומי עדיין ממתין.</span>
                  </li>
                  
                  <li className="text-sm text-gray-700" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
                    <span className="font-medium text-gray-900">חוזה סופי אוטומטי</span>
                    <span className="block text-gray-600 mt-1">לאחר שכל הצדדים יחתמו, קובץ PDF סופי עם כל החתימות יהיה מוכן לשליחה אליך ואל כל החותמים.</span>
                  </li>

                </ol>
              </div>
            )}
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex md:flex-row flex-col justify-center gap-4">
            {!allSigned ? (
              <button
                onClick={sendAllInvitations}
                disabled={sending || signers.filter(s => s.email && s.email !== 'direct-sign@greenlease.me' && s.status === 'not_sent' && s.signerType !== 'landlord').length === 0}
                className="px-8 py-3 bg-[#38E18E] text-[#281D57] rounded-lg font-semibold hover:bg-[#2bc77a] disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
              >
                {sending ? 'שולח...' : 'שלח הזמנות לחתימה לכל החותמים'}
              </button>
            ) : (
              /* Send signed contract by email button - show when all signed */
              <button
                onClick={sendSignedContractByEmail}
                disabled={sending}
                className="px-8 py-3 bg-[#38E18E] text-[#281D57] rounded-lg font-semibold hover:bg-[#2bc77a] disabled:opacity-50 transition-colors"
                style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
              >
                {sending ? 'שולח...' : 'שלח חוזה חתום במייל לכל הצדדים'}
              </button>
            )}
            
            {/* Download signed PDF button - show only in dev or when all signed in prod */}
            {(() => {
              const isDevelopment = process.env.NODE_ENV === 'development' || 
                                   typeof window !== 'undefined' && 
                                   (window.location.hostname === 'localhost' || 
                                    window.location.hostname.includes('vercel.app'));
              
              // Show in dev environment OR when all parties have signed in production
              const shouldShow = isDevelopment || allSigned;
              
              if (!shouldShow) {
                return null;
              }
              
              return (
                <button
                  onClick={downloadSignedContract}
                  disabled={sending}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors border border-gray-300"
                  style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
                >
                  {sending ? 'מוריד...' : 'הורד PDF חתום'}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Signature Modal for Direct Signing */}
      {showSignatureModal && currentSigner && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[10000] p-4 md:p-4 p-0">
          <div className="bg-white rounded-lg md:rounded-lg rounded-none shadow-xl max-w-2xl w-full max-h-[90vh] md:max-h-[90vh] h-full md:h-auto overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 md:p-6 p-4 border-b">
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
            <div className="p-6 md:p-6 p-4">
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