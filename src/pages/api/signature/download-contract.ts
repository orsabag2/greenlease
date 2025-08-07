import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import contractMerge from '@/utils/contractMerge';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Download contract API called with method:', req.method);
  console.log('Download contract API request body:', req.body);
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contractId, signers } = req.body;

  console.log('Extracted fields:', { contractId, signersCount: signers?.length });

  if (!contractId || !signers) {
    console.log('Missing required fields:', { contractId: !!contractId, signers: !!signers });
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    console.log('Getting contract data for:', contractId);
    
    // Get contract data
    const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
    if (!contractDoc.exists()) {
      console.log('Contract not found:', contractId);
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contractData = contractDoc.data();
    const answers = contractData.answers || contractData;
    console.log('Contract data retrieved, answers keys:', Object.keys(answers));

    // Get all signatures for this contract directly from Firestore
    console.log('Fetching signatures for contract:', contractId);
    
    let signatures;
    try {
      const signaturesQuery = query(
        collection(db, 'signatureInvitations'),
        where('contractId', '==', contractId),
        where('status', '==', 'signed')
      );
      const signaturesSnapshot = await getDocs(signaturesQuery);
      signatures = signaturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Found signatures:', signatures.length);
    } catch (error) {
      console.log('Error fetching signatures from Firestore:', error);
      throw error;
    }

    // Generate signed contract HTML
    console.log('Fetching template...');
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(process.cwd(), 'public', 'data', 'master-template.txt');
    const template = fs.readFileSync(templatePath, 'utf8');
    console.log('Template fetched, length:', template.length);
    
    console.log('Merging contract...');
    const contractHtml = contractMerge(template, answers);
    console.log('Contract merged, length:', contractHtml.length);
    
    // Add signatures to the HTML
    console.log('Adding signatures to contract...');
    const signedContractHtml = addSignaturesToContract(contractHtml, signatures);
    console.log('Signatures added, final length:', signedContractHtml.length);

    // Convert to PDF
    console.log('Converting to PDF...');
    console.log('PDFShift API Key exists:', !!process.env.PDFSHIFT_API_KEY);
    console.log('PDFShift API Key (first 10 chars):', process.env.PDFSHIFT_API_KEY?.substring(0, 10) + '...');
    
    if (!process.env.PDFSHIFT_API_KEY) {
      console.log('PDFShift API key not found, returning HTML instead');
      // Return HTML instead of PDF for debugging
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="contract_${contractId}.html"`);
      res.send(signedContractHtml);
      return;
    }

    // Force PDF generation - don't fall back to HTML for debug button
    console.log('Forcing PDF generation for debug button...');
    console.log('Signed contract HTML length:', signedContractHtml.length);
    console.log('First 500 chars of HTML:', signedContractHtml.substring(0, 500));
    console.log('PDFShift API Key exists:', !!process.env.PDFSHIFT_API_KEY);
    console.log('PDFShift API Key (first 10 chars):', process.env.PDFSHIFT_API_KEY?.substring(0, 10) + '...');
    
    // Test with a simple HTML first
    console.log('Testing with simple HTML first...');
    const simpleHtml = '<html><body><h1>Test PDF</h1><p>This is a test.</p></body></html>';
    
    const testResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PDFSHIFT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: simpleHtml,
        format: 'A4',
        margin: '1cm',
        landscape: false,
      }),
    });
    
    console.log('Test response status:', testResponse.status);
    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.log('Test response error:', testError);
      throw new Error(`PDFShift test failed: ${testResponse.status} - ${testError}`);
    }
    
    console.log('Test successful, now trying with actual contract...');
    
    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PDFSHIFT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: signedContractHtml,
        format: 'A4',
        margin: '1cm',
        landscape: false,
        css: `
          body { font-family: 'Noto Sans Hebrew', Arial, sans-serif; direction: rtl; }
          .signature-placeholder { 
            display: inline-block; 
            width: 200px; 
            height: 80px; 
            border: 1px solid #ccc; 
            margin: 10px 0; 
            text-align: center;
            line-height: 80px;
            font-size: 12px;
            color: #666;
          }
        `
      }),
    });

    console.log('PDF response status:', pdfResponse.status);
    console.log('PDF response headers:', Object.fromEntries(pdfResponse.headers.entries()));
    
    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.log('PDF generation failed:', errorText);
      console.log('PDF response status text:', pdfResponse.statusText);
      
      throw new Error(`Failed to generate PDF: ${pdfResponse.status} ${errorText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDF generated, size:', pdfBuffer.byteLength);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract_${contractId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.byteLength);

    // Send the PDF buffer
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('Error downloading contract:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Request body:', req.body);
    console.error('Contract ID:', contractId);
    console.error('Signers:', signers);
    
    res.status(500).json({ 
      error: 'Failed to download contract', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestInfo: {
        contractId,
        signersCount: signers?.length || 0
      }
    });
  }
}

function addSignaturesToContract(contractHtml: string, signatures: any[]): string {
  let signedHtml = contractHtml;
  
  console.log('Adding signatures to contract. Found signatures:', signatures.length);
  console.log('Signature details:', signatures.map(s => ({ role: s.signerRole, name: s.signerName })));
  
  // Add signatures to the contract
  signatures.forEach((signature) => {
    const signatureImage = signature.signatureImage;
    const signerName = signature.signerName;
    const signerRole = signature.signerRole;
    
    console.log('Processing signature for:', signerRole, signerName);
    
    // Find signature placeholders and replace them
    const placeholderPattern = new RegExp(`<span class="signature-placeholder">${signerRole}</span>`, 'g');
    const signatureHtml = `
      <div style="text-align: center; margin: 10px 0;">
        <img src="${signatureImage}" style="max-width: 200px; max-height: 80px; border: 1px solid #ccc;" />
        <div style="font-size: 12px; margin-top: 5px;">${signerName}</div>
      </div>
    `;
    
    const matches = signedHtml.match(placeholderPattern);
    console.log(`Found ${matches ? matches.length : 0} placeholders for ${signerRole}`);
    
    signedHtml = signedHtml.replace(placeholderPattern, signatureHtml);
  });
  
  console.log('Signatures added successfully');
  return signedHtml;
}
