import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
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

    // Get all signatures for this contract
    console.log('Fetching signatures for contract:', contractId);
    const signaturesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/signature/get-signatures?contractId=${contractId}`);
    const signaturesData = await signaturesResponse.json();
    
    console.log('Signatures response status:', signaturesResponse.status);
    console.log('Signatures data:', signaturesData);
    
    if (!signaturesResponse.ok) {
      console.log('Failed to fetch signatures:', signaturesData);
      throw new Error('Failed to fetch signatures');
    }

    const signatures = signaturesData.signatures || [];
    console.log('Found signatures:', signatures.length);

    // Generate signed contract HTML
    console.log('Fetching template...');
    const templateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/data/master-template.txt`);
    const template = await templateResponse.text();
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
    
    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PDFSHIFT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: signedContractHtml,
        format: 'A4',
        margin: '1cm',
        landscape: false,
        css: `
          body { 
            font-family: 'Noto Sans Hebrew', Arial, sans-serif; 
            direction: rtl; 
            line-height: 1.6;
            margin: 20px;
          }
          .signature-header {
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
          }
          .signature-block {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .signature-block strong {
            font-weight: bold;
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
      
      // Check if it's an API key error
      if (pdfResponse.status === 401 && errorText.includes('API Key')) {
        console.log('Invalid PDFShift API key, returning HTML instead');
        // Return HTML instead of PDF when API key is invalid
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="contract_${contractId}.html"`);
        res.send(signedContractHtml);
        return;
      }
      
      // For any other error, still try to return PDF if possible
      console.log('Attempting to get PDF despite error...');
      try {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        if (pdfBuffer.byteLength > 0) {
          console.log('PDF generated despite error, size:', pdfBuffer.byteLength);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="contract_${contractId}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.byteLength);
          res.send(Buffer.from(pdfBuffer));
          return;
        }
      } catch (bufferError) {
        console.log('Could not get PDF buffer:', bufferError);
      }
      
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
    res.status(500).json({ 
      error: 'Failed to download contract', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

function addSignaturesToContract(contractHtml: string, signatures: any[]): string {
  let signedHtml = contractHtml;
  
  console.log('Adding signatures to contract. Found signatures:', signatures.length);
  
  // Add signatures to the contract
  signatures.forEach((signature) => {
    const signatureImage = signature.signatureImage;
    const signerName = signature.signerName;
    const signerRole = signature.signerRole;
    
    console.log('Processing signature for:', signerRole, signerName);
    
    // Create signature HTML
    const signatureHtml = `
      <div style="text-align: center; margin: 10px 0; border: 1px solid #ccc; padding: 10px; display: inline-block; min-width: 200px;">
        <img src="${signatureImage}" style="max-width: 180px; max-height: 60px; display: block; margin: 0 auto;" />
        <div style="font-size: 12px; margin-top: 5px; font-weight: bold;">${signerName}</div>
        <div style="font-size: 10px; color: #666;">${signerRole}</div>
      </div>
    `;
    
    // Replace signature placeholders based on role
    if (signerRole === 'המשכיר') {
      // Replace the landlord signature line
      const landlordPattern = /<strong>המשכיר<\/strong>: ____________________/g;
      signedHtml = signedHtml.replace(landlordPattern, `<strong>המשכיר</strong>: ${signatureHtml}`);
    } else if (signerRole === 'השוכר') {
      // Replace the tenant signature line
      const tenantPattern = /<strong>השוכר<\/strong>: ____________________/g;
      signedHtml = signedHtml.replace(tenantPattern, `<strong>השוכר</strong>: ${signatureHtml}`);
    } else if (signerRole === 'ערב ראשון' || signerRole === 'ערב שני') {
      // Add guarantor signatures after the main signatures
      const guarantorSignature = `
        <div class="signature-block">
          <strong>${signerRole}</strong>: ${signatureHtml}
          שם: <strong>${signerName}</strong>
        </div>
      `;
      
      // Add guarantor signature before the closing section
      signedHtml = signedHtml.replace('⸻\n\n16. {{guarantorsSection}}', `${guarantorSignature}\n\n⸻\n\n16. {{guarantorsSection}}`);
    }
  });
  
  console.log('Signatures added successfully');
  return signedHtml;
}
