import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { token, signature, ipAddress, userAgent } = req.body;

  if (!token || !signature || !ipAddress || !userAgent) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    // Find invitation by token
    const invitationsQuery = query(
      collection(db, 'signatureInvitations'),
      where('invitationToken', '==', token)
    );
    
    const invitationsSnapshot = await getDocs(invitationsQuery);
    
    if (invitationsSnapshot.empty) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    const invitationDoc = invitationsSnapshot.docs[0];
    const invitation = invitationDoc.data();

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = invitation.expiresAt.toDate();
    
    if (now > expiresAt) {
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // Check if already signed
    if (invitation.status === 'signed') {
      return res.status(409).json({ error: 'Contract already signed' });
    }

    // Update invitation with signature
    await updateDoc(doc(db, 'signatureInvitations', invitationDoc.id), {
      status: 'signed',
      signatureImage: signature,
      signedAt: new Date(),
      ipAddress,
      userAgent
    });

    // Check if all invitations for this contract are signed
    const contractInvitationsQuery = query(
      collection(db, 'signatureInvitations'),
      where('contractId', '==', invitation.contractId)
    );
    
    const contractInvitationsSnapshot = await getDocs(contractInvitationsQuery);
    const allInvitations = contractInvitationsSnapshot.docs.map(doc => doc.data());
    const allSigned = allInvitations.every(inv => inv.status === 'signed');

    // Update contract signatures document
    const contractSignaturesRef = doc(db, 'contractSignatures', invitation.contractId);
    await setDoc(contractSignaturesRef, {
      contractId: invitation.contractId,
      allSigned,
      updatedAt: new Date()
    }, { merge: true });

    // If all signed, trigger final contract generation
    if (allSigned) {
      try {
        await generateAndSendFinalContract(invitation.contractId);
      } catch (error) {
        console.error('Error generating final contract:', error);
        // Don't fail the signature save if final contract generation fails
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Signature saved successfully',
      allSigned
    });
  } catch (error) {
    console.error('Error saving signature:', error);
    res.status(500).json({ error: 'Failed to save signature', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function generateAndSendFinalContract(contractId: string) {
  try {
    // Get contract data
    const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
    if (!contractDoc.exists()) {
      throw new Error('Contract not found');
    }

    const contractData = contractDoc.data();

    // Get all signatures
    const signaturesQuery = query(
      collection(db, 'signatureInvitations'),
      where('contractId', '==', contractId),
      where('status', '==', 'signed')
    );
    
    const signaturesSnapshot = await getDocs(signaturesQuery);
    const signatures = signaturesSnapshot.docs.map(doc => doc.data());

    // Generate contract with signatures
    const contractWithSignatures = await generateContractWithSignatures(contractData, signatures);

    // Send final contract to all parties
    await sendFinalContractToAllParties(contractData, signatures, contractWithSignatures);

    // Update contract signatures document
    const contractSignaturesRef = doc(db, 'contractSignatures', contractId);
    await updateDoc(contractSignaturesRef, {
      sentToAllParties: true,
      finalPdfUrl: contractWithSignatures.pdfUrl,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error in generateAndSendFinalContract:', error);
    throw error;
  }
}

async function generateContractWithSignatures(contractData: any, signatures: any[]) {
  // This is a placeholder - you'll need to implement the actual PDF generation
  // with signatures placed above the signature lines
  console.log('Generating contract with signatures:', { contractData, signatures });
  
  // For now, return a mock PDF URL
  return {
    pdfUrl: `/api/generate-final-contract?contractId=${contractData.id}`
  };
}

async function sendFinalContractToAllParties(contractData: any, signatures: any[], finalContract: any) {
  // This is a placeholder - you'll need to implement the actual email sending
  console.log('Sending final contract to all parties:', { contractData, signatures, finalContract });
  
  // Send to all signers
  for (const signature of signatures) {
    try {
      // Send email with final contract
      console.log(`Sending final contract to ${signature.signerEmail}`);
    } catch (error) {
      console.error(`Error sending final contract to ${signature.signerEmail}:`, error);
    }
  }
} 