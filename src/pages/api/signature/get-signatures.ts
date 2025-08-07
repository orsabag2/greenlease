import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Get signatures API called with method:', req.method);
  console.log('Get signatures API query:', req.query);
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contractId } = req.query;

  console.log('Contract ID from query:', contractId);

  if (!contractId || typeof contractId !== 'string') {
    console.log('Missing or invalid contract ID');
    res.status(400).json({ error: 'Missing contract ID' });
    return;
  }

  try {
    console.log('Querying signatures for contract:', contractId);
    
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

    console.log('Found signatures:', signatures.length);
    console.log('Signature details:', signatures.map(s => ({ id: s.id, signerName: s.signerName, signerRole: s.signerRole })));

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
