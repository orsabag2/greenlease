import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';

// Helper function to clean up duplicate invitations
async function cleanupDuplicateInvitations(contractId: string) {
  try {
    console.log('Starting cleanup for contract:', contractId);

    // Get all invitations for this contract
    const invitationsQuery = query(
      collection(db, 'signatureInvitations'),
      where('contractId', '==', contractId)
    );
    
    const invitationsSnapshot = await getDocs(invitationsQuery);
    const allInvitations = invitationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    // Group invitations by signer (signerId + signerType)
    const signerGroups: { [key: string]: any[] } = {};
    
    allInvitations.forEach(invitation => {
      const key = `${invitation.signerId}-${invitation.signerType}`;
      if (!signerGroups[key]) {
        signerGroups[key] = [];
      }
      signerGroups[key].push(invitation);
    });

    let deletedCount = 0;

    // For each group, keep only the most recent invitation
    for (const [signerKey, invitations] of Object.entries(signerGroups)) {
      if (invitations.length > 1) {
        console.log(`Found ${invitations.length} invitations for signer: ${signerKey}`);
        
        // Sort by sentAt timestamp (most recent first)
        const sortedInvitations = invitations.sort((a, b) => {
          const aSentAt = a.sentAt?.toDate?.() || a.sentAt || new Date(0);
          const bSentAt = b.sentAt?.toDate?.() || b.sentAt || new Date(0);
          return bSentAt.getTime() - aSentAt.getTime();
        });

        // Keep the first (most recent) invitation, delete the rest
        const toDelete = sortedInvitations.slice(1);
        
        for (const invitation of toDelete) {
          try {
            await deleteDoc(doc(db, 'signatureInvitations', invitation.id));
            deletedCount++;
            console.log(`Deleted duplicate invitation: ${invitation.id} for ${invitation.signerName}`);
          } catch (error) {
            console.error(`Error deleting invitation ${invitation.id}:`, error);
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleanup completed. Deleted ${deletedCount} duplicate invitations.`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return 0;
  }
}

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

    // Clean up any duplicate invitations (from previous buggy behavior)
    try {
      const cleanupResult = await cleanupDuplicateInvitations(contractId);
      if (cleanupResult > 0) {
        console.log(`API: Cleaned up ${cleanupResult} duplicate invitations`);
      }
    } catch (cleanupError) {
      console.error('API: Error during cleanup:', cleanupError);
      // Continue with status check even if cleanup fails
    }

    // Get all invitations for this contract
    const invitationsQuery = query(
      collection(db, 'signatureInvitations'),
      where('contractId', '==', contractId)
    );
    
    const invitationsSnapshot = await getDocs(invitationsQuery);
    const allInvitations = invitationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    console.log('API: Found invitations:', allInvitations.length);

    // Helper function to get the most recent invitation for a signer
    const getMostRecentInvitation = (signerId: string, signerType: string) => {
      const signerInvitations = allInvitations.filter(inv => 
        inv.signerId === signerId && inv.signerType === signerType
      );
      
      if (signerInvitations.length === 0) return null;
      
      // Sort by sentAt timestamp (most recent first) and return the first one
      return signerInvitations.sort((a, b) => {
        const aSentAt = a.sentAt?.toDate?.() || a.sentAt || new Date(0);
        const bSentAt = b.sentAt?.toDate?.() || b.sentAt || new Date(0);
        return bSentAt.getTime() - aSentAt.getTime();
      })[0];
    };

    // Build signers list with current status
    const signers = [];

                    // Add landlord
                console.log('API: Processing landlords...');
                console.log('API: answers.landlords:', answers.landlords);
                console.log('API: answers.landlordName:', answers.landlordName);
                console.log('API: answers.landlordId:', answers.landlordId);
                
                if (answers.landlords && answers.landlords.length > 0) {
                  answers.landlords.forEach((landlord: any, index: number) => {
                    console.log('API: Processing landlord:', landlord);
                    
                    // Generate a unique signerId if landlordId is empty
                    const signerId = landlord.landlordId || `landlord-${index}-${landlord.landlordName || 'unknown'}`;
                    
                    const invitation = getMostRecentInvitation(signerId, 'landlord');
                    
                    const signer = {
                      role: 'המשכיר',
                      name: landlord.landlordName || '',
                      status: invitation?.status || 'not_sent',
                      email: invitation?.signerEmail || landlord.landlordEmail || '',
                      signerType: 'landlord',
                      signerId: signerId,
                      invitationId: invitation?.id,
                      signatureImage: invitation?.signatureImage || null
                    };
                    
                    console.log('API: Created landlord signer:', signer);
                    signers.push(signer);
                  });
                } else if (answers.landlordName) {
                  console.log('API: Using direct landlord fields');
                  const signerId = answers.landlordId || `landlord-single-${answers.landlordName}`;
                  const invitation = getMostRecentInvitation(signerId, 'landlord');
                  
                  const signer = {
                    role: 'המשכיר',
                    name: answers.landlordName,
                    status: invitation?.status || 'not_sent',
                    email: invitation?.signerEmail || answers.landlordEmail || '',
                    signerType: 'landlord',
                    signerId: signerId,
                    invitationId: invitation?.id,
                    signatureImage: invitation?.signatureImage || null
                  };
                  
                  console.log('API: Created landlord signer:', signer);
                  signers.push(signer);
                } else {
                  console.log('API: No landlord data found');
                }

                    // Add tenants
                if (answers.tenants && answers.tenants.length > 0) {
                  answers.tenants.forEach((tenant: any, index: number) => {
                    // Generate a unique signerId if tenantIdNumber is empty
                    const signerId = tenant.tenantIdNumber || `tenant-${index}-${tenant.tenantName || 'unknown'}`;
                    
                    const invitation = getMostRecentInvitation(signerId, 'tenant');
                    
                    signers.push({
                      role: answers.tenants.length === 1 ? 'השוכר' : `שוכר ${index + 1}`,
                      name: tenant.tenantName || '',
                      status: invitation?.status || 'not_sent',
                      email: invitation?.signerEmail || tenant.tenantEmail || '',
                      signerType: 'tenant',
                      signerId: signerId,
                      invitationId: invitation?.id,
                      signatureImage: invitation?.signatureImage || null
                    });
                  });
                } else if (answers.tenantName) {
                  const signerId = answers.tenantIdNumber || `tenant-single-${answers.tenantName}`;
                  const invitation = getMostRecentInvitation(signerId, 'tenant');
                  
                  signers.push({
                    role: 'השוכר',
                    name: answers.tenantName,
                    status: invitation?.status || 'not_sent',
                    email: invitation?.signerEmail || answers.tenantEmail || '',
                    signerType: 'tenant',
                    signerId: signerId,
                    invitationId: invitation?.id,
                    signatureImage: invitation?.signatureImage || null
                  });
                }

                    // Add guarantors
                if (answers.guarantorsCount && answers.guarantorsCount > 0) {
                  for (let i = 1; i <= answers.guarantorsCount; i++) {
                    const guarantorName = answers[`guarantor${i}Name`];
                    const guarantorId = answers[`guarantor${i}Id`];
                    const guarantorEmail = answers[`guarantor${i}Email`];
                    
                    if (guarantorName) {
                      // Generate a unique signerId if guarantorId is empty
                      const signerId = guarantorId || `guarantor-${i}-${guarantorName}`;
                      
                      const invitation = getMostRecentInvitation(signerId, 'guarantor');
                      
                      signers.push({
                        role: i === 1 ? 'ערב ראשון' : 'ערב שני',
                        name: guarantorName,
                        status: invitation?.status || 'not_sent',
                        email: invitation?.signerEmail || guarantorEmail || '',
                        signerType: 'guarantor',
                        signerId: signerId,
                        invitationId: invitation?.id,
                        signatureImage: invitation?.signatureImage || null
                      });
                    }
                  }
                }

    // Filter out signers with empty names
    const validSigners = signers.filter(signer => signer.name && signer.name.trim() !== '');
    
    console.log('API: Created signers:', signers);
    console.log('API: Valid signers (with names):', validSigners);
    console.log('API: Signers with status:', validSigners.map(s => ({ name: s.name, status: s.status, email: s.email })));
    
    res.status(200).json({
      signers: validSigners,
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
