import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
    // Get all signed invitations for this contract
    const invitationsQuery = query(
      collection(db, 'signatureInvitations'),
      where('contractId', '==', contractId),
      where('status', '==', 'signed')
    );
    
    const invitationsSnapshot = await getDocs(invitationsQuery);
    const signatures = invitationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      signatures,
      count: signatures.length
    });
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ 
      error: 'Failed to fetch signatures', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
