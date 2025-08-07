import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import contractMerge from '@/utils/contractMerge';

// Create transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contractId, signers } = req.body;

  if (!contractId || !signers) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    // Get contract data
    const contractDoc = await getDoc(doc(db, 'formAnswers', contractId));
    if (!contractDoc.exists()) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contractData = contractDoc.data();
    const answers = contractData.answers || contractData;

    // Get all signatures for this contract
    const signaturesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/signature/get-signatures?contractId=${contractId}`);
    const signaturesData = await signaturesResponse.json();
    
    if (!signaturesResponse.ok) {
      throw new Error('Failed to fetch signatures');
    }

    const signatures = signaturesData.signatures || [];

    // Generate signed contract HTML
    const templateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/data/master-template.txt`);
    const template = await templateResponse.text();
    
    const contractHtml = contractMerge(template, answers);
    
    // Add signatures to the HTML
    const signedContractHtml = addSignaturesToContract(contractHtml, signatures);

    // Convert to PDF
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

    if (!pdfResponse.ok) {
      throw new Error('Failed to generate PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Send email to each signer
    let sentCount = 0;
    for (const signer of signers) {
      if (signer.email && signer.email !== 'direct-sign@greenlease.me') {
        try {
          await transporter.sendMail({
            from: `"GreenLease" <${process.env.GMAIL_USER}>`,
            to: signer.email,
            subject: `חוזה שכירות חתום - ${answers.street || ''} ${answers.buildingNumber || ''}`,
            html: `
              <div style="font-family: 'Noto Sans Hebrew', Arial, sans-serif; direction: rtl;">
                <h2>שלום ${signer.name},</h2>
                <p>החוזה השכירות עבור ${answers.street || ''} ${answers.buildingNumber || ''} חתום על ידי כל הצדדים.</p>
                <p>בקובץ המצורף תוכל למצוא את החוזה החתום.</p>
                <p>תודה,<br>צוות GreenLease</p>
              </div>
            `,
            attachments: [
              {
                filename: `חוזה_שכירות_חתום_${contractId}.pdf`,
                content: Buffer.from(pdfBuffer),
                contentType: 'application/pdf'
              }
            ]
          });
          sentCount++;
        } catch (error) {
          console.error(`Failed to send email to ${signer.email}:`, error);
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Contract distributed successfully',
      sentCount 
    });
  } catch (error) {
    console.error('Error distributing contract:', error);
    res.status(500).json({ 
      error: 'Failed to distribute contract', 
      details: error instanceof Error ? error.message : 'Unknown error' 
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
