import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Missing or invalid token' });
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

    // Get contract data
    const contractDoc = await getDoc(doc(db, 'formAnswers', invitation.contractId));
    if (!contractDoc.exists()) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contractData = contractDoc.data();

    // Return invitation and contract data
    res.status(200).json({
      invitation: {
        id: invitationDoc.id,
        contractId: invitation.contractId,
        signerEmail: invitation.signerEmail,
        signerName: invitation.signerName,
        signerType: invitation.signerType,
        signerId: invitation.signerId,
        signerRole: invitation.signerRole,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toDate()
      },
      contractData: contractData
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token', details: error instanceof Error ? error.message : 'Unknown error' });
  }
} 