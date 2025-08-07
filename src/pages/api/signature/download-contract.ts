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
    
    if (!process.env.PDFSHIFT_API_KEY) {
      console.log('PDFShift API key not found, returning HTML instead');
      // Return HTML instead of PDF for debugging
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="חוזה_שכירות_חתום_${contractId}.html"`);
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
    
    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.log('PDF generation failed:', errorText);
      
      // Check if it's an API key error
      if (pdfResponse.status === 401 && errorText.includes('API Key')) {
        console.log('Invalid PDFShift API key, returning HTML instead');
        // Return HTML instead of PDF when API key is invalid
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="חוזה_שכירות_חתום_${contractId}.html"`);
        res.send(signedContractHtml);
        return;
      }
      
      throw new Error(`Failed to generate PDF: ${pdfResponse.status} ${errorText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDF generated, size:', pdfBuffer.byteLength);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="חוזה_שכירות_חתום_${contractId}.pdf"`);
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
  
  // Add signatures to the contract
  signatures.forEach((signature) => {
    const signatureImage = signature.signatureImage;
    const signerName = signature.signerName;
    const signerRole = signature.signerRole;
    
    // Find signature placeholders and replace them
    const placeholderPattern = new RegExp(`<span class="signature-placeholder">${signerRole}</span>`, 'g');
    const signatureHtml = `
      <div style="text-align: center; margin: 10px 0;">
        <img src="${signatureImage}" style="max-width: 200px; max-height: 80px; border: 1px solid #ccc;" />
        <div style="font-size: 12px; margin-top: 5px;">${signerName}</div>
      </div>
    `;
    
    signedHtml = signedHtml.replace(placeholderPattern, signatureHtml);
  });
  
  return signedHtml;
}
