import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { generateContractHtml } from '@/utils/contractGeneration';

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

    // Validate that we have signatures with valid names
    const validSignatures = signatures.filter((sig: any) => sig.signerName && sig.signerName.trim() !== '');
    if (validSignatures.length === 0) {
      console.log('No valid signatures found (all signatures have empty names)');
      res.status(400).json({ error: 'No valid signatures found. Please ensure all signers have names.' });
      return;
    }
    
    console.log('Valid signatures found:', validSignatures.length);
    signatures = validSignatures; // Use only valid signatures

    // Generate signed contract HTML
    console.log('Fetching template...');
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(process.cwd(), 'public', 'data', 'master-template.txt');
    const template = fs.readFileSync(templatePath, 'utf8');
    console.log('Template fetched, length:', template.length);
    
    console.log('Generating contract HTML...');
    const contractHtml = generateContractHtml(answers, template, signatures);
    console.log('Contract HTML generated, length:', contractHtml.length);
    console.log('Contract HTML preview (first 500 chars):', contractHtml.substring(0, 500));
    console.log('Contract HTML preview (last 500 chars):', contractHtml.substring(contractHtml.length - 500));
    
    const signedContractHtml = contractHtml;
    console.log('Contract HTML length:', signedContractHtml.length);

    // Convert to PDF using the exact same approach as contract preview
    console.log('Converting to PDF using contract preview approach...');
    
    // Google Fonts link for Frank Ruhl Libre (same as contract preview)
    const fontLink = `<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" rel="stylesheet">`;
    
    // Ensure font-family is set for contract-preview and .page (same as contract preview)
    const fontCss = `
      .contract-preview, .page, body {
        font-family: 'Frank Ruhl Libre', 'Noto Sans Hebrew', Arial, sans-serif !important;
      }
    `;
    
    // The generateContractHtml already returns a complete HTML document, so use it directly
    let fullHtml = signedContractHtml;

    // PDFShift options for A4 and margins (further increased margins)
    const pdfShiftOptions = {
      source: fullHtml,
      landscape: false, // Portrait A4
      margin: {
        top: '3.5cm',
        bottom: '3.5cm',
        left: '2.5cm',
        right: '2.5cm',
      },
    };

    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk_e0e70090e19433315fd54ce22045e16600e7bf2f', // Same API key as contract preview
      },
      body: JSON.stringify(pdfShiftOptions),
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
      <div style="text-align: center; margin: 10px 0; display: inline-block;">
        <img src="${signatureImage}" style="max-width: 200px; max-height: 80px; border: 1px solid #ccc; display: block;" />
        <div style="font-size: 12px; margin-top: 5px; font-weight: bold;">${signerName}</div>
      </div>
    `;
    
    const matches = signedHtml.match(placeholderPattern);
    console.log(`Found ${matches ? matches.length : 0} placeholders for ${signerRole}`);
    
    if (matches && matches.length > 0) {
      signedHtml = signedHtml.replace(placeholderPattern, signatureHtml);
      console.log(`Successfully replaced ${matches.length} placeholders for ${signerRole}`);
    } else {
      console.log(`No placeholders found for ${signerRole}, adding signature at end of signature block`);
      // If no placeholder found, add signature at the end of the signature section
      const signatureBlockPattern = /<div class="signature-block">/g;
      const lastSignatureBlock = signedHtml.lastIndexOf('<div class="signature-block">');
      if (lastSignatureBlock !== -1) {
        const insertPosition = signedHtml.indexOf('</div>', lastSignatureBlock) + 6;
        signedHtml = signedHtml.slice(0, insertPosition) + signatureHtml + signedHtml.slice(insertPosition);
        console.log(`Added signature for ${signerRole} at end of signature section`);
      }
    }
  });
  
  console.log('Signatures added successfully');
  return signedHtml;
}
