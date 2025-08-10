import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Test UUID generation
console.log('UUID test:', uuidv4());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Direct sign API called with method:', req.method);
  console.log('Direct sign API request body:', req.body);
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contractId, signerId, signerName, signerType, signerRole, signature, ipAddress, userAgent } = req.body;
  
  console.log('Extracted fields:', { contractId, signerId, signerName, signerType, signatureLength: signature?.length });

  if (!contractId || !signerId || !signerName || !signerType || !signerRole || !signature) {
    console.log('Missing required fields:', { contractId: !!contractId, signerId: !!signerId, signerName: !!signerName, signerType: !!signerType, signerRole: !!signerRole, signature: !!signature });
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    console.log('Creating invitation data...');
    // Create a direct signature invitation
    const invitationData = {
      contractId,
      signerEmail: 'direct-sign@greenlease.me',
      signerName,
      signerType,
      signerId,
      signerRole: signerRole,
      invitationToken: uuidv4(),
      status: 'signed', // Mark as signed immediately
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      signedAt: new Date(),
      signatureImage: signature,
      ipAddress: ipAddress || 'direct-sign',
      userAgent: userAgent || 'direct-sign'
    };

    console.log('Invitation data created:', invitationData);
    
    // Add the invitation to Firestore
    console.log('Adding to Firestore...');
    const invitationRef = await addDoc(collection(db, 'signatureInvitations'), invitationData);
    console.log('Added to Firestore with ID:', invitationRef.id);

    // Update contract signatures document
    const contractSignaturesRef = doc(db, 'contractSignatures', contractId);
    await setDoc(contractSignaturesRef, {
      contractId,
      updatedAt: new Date()
    }, { merge: true });

    res.status(200).json({ 
      success: true, 
      message: 'Signature saved successfully',
      invitationId: invitationRef.id
    });
  } catch (error) {
    console.error('Error saving direct signature:', error);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      error: 'Failed to save signature', 
      details: error instanceof Error ? error.message : 'Unknown error',
      requestBody: req.body 
    });
  }
}
