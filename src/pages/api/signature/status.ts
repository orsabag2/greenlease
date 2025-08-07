import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contractId } = req.query;

  if (!contractId || typeof contractId !== 'string') {
    res.status(400).json({ error: 'Missing contract ID' });
    return;
  }

  try {
    // Get contract data
    const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
    if (!contractDoc.exists()) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contractData = contractDoc.data();
    console.log('API: Contract data keys:', Object.keys(contractData));
    console.log('API: Landlords:', contractData.landlords);
    console.log('API: Tenants:', contractData.tenants);
    console.log('API: Guarantors count:', contractData.guarantorsCount);

    // Get all invitations for this contract
    const invitationsQuery = query(
      collection(db, 'signatureInvitations'),
      where('contractId', '==', contractId)
    );
    
    const invitationsSnapshot = await getDocs(invitationsQuery);
    const invitations = invitationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('API: Found invitations:', invitations.length);

    // Build signers list with current status
    const signers = [];

    // Add landlord
    if (contractData.landlords && contractData.landlords.length > 0) {
      contractData.landlords.forEach((landlord: any) => {
        const invitation = invitations.find(inv => 
          inv.signerId === landlord.landlordId && inv.signerType === 'landlord'
        );
        
        signers.push({
          role: 'המשכיר',
          name: landlord.landlordName || '',
          status: invitation?.status || 'not_sent',
          email: invitation?.signerEmail || landlord.landlordEmail || '',
          signerType: 'landlord',
          signerId: landlord.landlordId || '',
          invitationId: invitation?.id
        });
      });
    } else if (contractData.landlordName) {
      const invitation = invitations.find(inv => 
        inv.signerId === contractData.landlordId && inv.signerType === 'landlord'
      );
      
      signers.push({
        role: 'המשכיר',
        name: contractData.landlordName,
        status: invitation?.status || 'not_sent',
        email: invitation?.signerEmail || contractData.landlordEmail || '',
        signerType: 'landlord',
        signerId: contractData.landlordId || '',
        invitationId: invitation?.id
      });
    }

    // Add tenants
    if (contractData.tenants && contractData.tenants.length > 0) {
      contractData.tenants.forEach((tenant: any) => {
        const invitation = invitations.find(inv => 
          inv.signerId === tenant.tenantIdNumber && inv.signerType === 'tenant'
        );
        
        signers.push({
          role: 'השוכר',
          name: tenant.tenantName || '',
          status: invitation?.status || 'not_sent',
          email: invitation?.signerEmail || tenant.tenantEmail || '',
          signerType: 'tenant',
          signerId: tenant.tenantIdNumber || '',
          invitationId: invitation?.id
        });
      });
    } else if (contractData.tenantName) {
      const invitation = invitations.find(inv => 
        inv.signerId === contractData.tenantIdNumber && inv.signerType === 'tenant'
      );
      
      signers.push({
        role: 'השוכר',
        name: contractData.tenantName,
        status: invitation?.status || 'not_sent',
        email: invitation?.signerEmail || contractData.tenantEmail || '',
        signerType: 'tenant',
        signerId: contractData.tenantIdNumber || '',
        invitationId: invitation?.id
      });
    }

    // Add guarantors
    if (contractData.guarantorsCount && contractData.guarantorsCount > 0) {
      for (let i = 1; i <= contractData.guarantorsCount; i++) {
        const guarantorName = contractData[`guarantor${i}Name`];
        const guarantorId = contractData[`guarantor${i}Id`];
        const guarantorEmail = contractData[`guarantor${i}Email`];
        
        if (guarantorName) {
          const invitation = invitations.find(inv => 
            inv.signerId === guarantorId && inv.signerType === 'guarantor'
          );
          
          signers.push({
            role: i === 1 ? 'ערב ראשון' : 'ערב שני',
            name: guarantorName,
            status: invitation?.status || 'not_sent',
            email: invitation?.signerEmail || guarantorEmail || '',
            signerType: 'guarantor',
            signerId: guarantorId || '',
            invitationId: invitation?.id
          });
        }
      }
    }

    console.log('API: Created signers:', signers);
    
    res.status(200).json({
      signers,
      contractData: {
        street: contractData.street || '',
        buildingNumber: contractData.buildingNumber || '',
        propertyCity: contractData.propertyCity || ''
      }
    });
  } catch (error) {
    console.error('Error fetching signature status:', error);
    res.status(500).json({ error: 'Failed to fetch signature status', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
