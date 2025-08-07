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
    
    // The actual contract data is in the 'answers' field
    const answers = contractData.answers || contractData;
    console.log('API: Answers keys:', Object.keys(answers));
    console.log('API: Landlords:', answers.landlords);
    console.log('API: Tenants:', answers.tenants);
    console.log('API: Guarantors count:', answers.guarantorsCount);

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
    if (answers.landlords && answers.landlords.length > 0) {
      answers.landlords.forEach((landlord: any) => {
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
    } else if (answers.landlordName) {
      const invitation = invitations.find(inv => 
        inv.signerId === answers.landlordId && inv.signerType === 'landlord'
      );
      
      signers.push({
        role: 'המשכיר',
        name: answers.landlordName,
        status: invitation?.status || 'not_sent',
        email: invitation?.signerEmail || answers.landlordEmail || '',
        signerType: 'landlord',
        signerId: answers.landlordId || '',
        invitationId: invitation?.id
      });
    }

    // Add tenants
    if (answers.tenants && answers.tenants.length > 0) {
      answers.tenants.forEach((tenant: any) => {
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
    } else if (answers.tenantName) {
      const invitation = invitations.find(inv => 
        inv.signerId === answers.tenantIdNumber && inv.signerType === 'tenant'
      );
      
      signers.push({
        role: 'השוכר',
        name: answers.tenantName,
        status: invitation?.status || 'not_sent',
        email: invitation?.signerEmail || answers.tenantEmail || '',
        signerType: 'tenant',
        signerId: answers.tenantIdNumber || '',
        invitationId: invitation?.id
      });
    }

    // Add guarantors
    if (answers.guarantorsCount && answers.guarantorsCount > 0) {
      for (let i = 1; i <= answers.guarantorsCount; i++) {
        const guarantorName = answers[`guarantor${i}Name`];
        const guarantorId = answers[`guarantor${i}Id`];
        const guarantorEmail = answers[`guarantor${i}Email`];
        
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
    console.log('API: Signers with status:', signers.map(s => ({ name: s.name, status: s.status, email: s.email })));
    
    res.status(200).json({
      signers,
      contractData: {
        street: answers.street || '',
        buildingNumber: answers.buildingNumber || '',
        propertyCity: answers.propertyCity || ''
      }
    });
  } catch (error) {
    console.error('Error fetching signature status:', error);
    res.status(500).json({ error: 'Failed to fetch signature status', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
