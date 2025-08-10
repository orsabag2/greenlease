import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/utils/firebase';
import { collection, addDoc, doc, getDoc, setDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contractId, signers } = req.body;

  if (!contractId || !signers || !Array.isArray(signers)) {
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
    console.log('Contract data for address extraction:', JSON.stringify(contractData, null, 2));
    const invitations = [];

    // Create invitations for each signer
    for (const signer of signers) {
      if (!signer.email || !signer.name) {
        continue; // Skip signers without email or name
      }

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitation = {
        contractId,
        signerEmail: signer.email,
        signerName: signer.name,
        signerType: signer.type,
        signerId: signer.id,
        signerRole: signer.role,
        invitationToken: token,
        status: 'sent',
        createdAt: new Date(),
        expiresAt,
        sentAt: new Date(),
        resendCount: 0
      };

      // Save invitation to Firestore
      const invitationRef = await addDoc(collection(db, 'signatureInvitations'), invitation);
      invitations.push({ ...invitation, id: invitationRef.id });

      // Send invitation email
      try {
        console.log(`Attempting to send invitation email to ${signer.email} for ${signer.name}`);
        await sendInvitationEmail(signer, token, contractData);
        console.log(`✓ Email sent successfully to ${signer.email}`);
      } catch (emailError) {
        console.error(`✗ Email sending failed for ${signer.email}:`, emailError);
        console.error('Email error details:', {
          signerEmail: signer.email,
          signerName: signer.name,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          stack: emailError instanceof Error ? emailError.stack : undefined
        });
        // Continue with invitation creation even if email fails
      }
    }

    // Create or update contract signatures document
    const contractSignaturesRef = doc(db, 'contractSignatures', contractId);
    await setDoc(contractSignaturesRef, {
      contractId,
      invitations: invitations,
      allSigned: false,
      sentToAllParties: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    res.status(200).json({ 
      success: true, 
      invitations,
      message: `Sent ${invitations.length} invitation(s) successfully`
    });
  } catch (error) {
    console.error('Error creating invitations:', error);
    res.status(500).json({ 
      error: 'Failed to create invitations', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function sendInvitationEmail(signer: any, token: string, contractData: any) {
  console.log('=== SEND INVITATION EMAIL STARTED ===');
  console.log('Signer:', { email: signer.email, name: signer.name, role: signer.role });
  
  // Check if Gmail credentials are available
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.warn('Gmail credentials not configured, skipping email sending');
    throw new Error('Gmail credentials not configured');
  }
  
  console.log('Gmail credentials available:', {
    user: process.env.GMAIL_USER ? '✓' : '✗',
    pass: process.env.GMAIL_PASS ? '✓' : '✗'
  });
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  
  // Verify transporter configuration
  try {
    console.log('Verifying transporter configuration...');
    await transporter.verify();
    console.log('✓ Transporter verified successfully');
  } catch (verifyError) {
    console.error('✗ Transporter verification failed:', verifyError);
    throw new Error(`Transporter verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const signUrl = `${baseUrl}/signature/${token}`;
  
  // Extract property address - handle different data structures
  // Try to get address from flattened structure first, then from nested structure
  let street = contractData.street;
  let buildingNumber = contractData.buildingNumber;
  let apartmentNumber = contractData.apartmentNumber;
  let propertyCity = contractData.propertyCity;
  
  // If not found in flattened structure, try nested answers structure
  if (!street && contractData.answers) {
    street = contractData.answers.street;
    buildingNumber = contractData.answers.buildingNumber;
    apartmentNumber = contractData.answers.apartmentNumber;
    propertyCity = contractData.answers.propertyCity;
  }
  
  const addressParts = [
    street,
    buildingNumber,
    apartmentNumber ? `דירה ${apartmentNumber}` : '',
    propertyCity
  ].filter(Boolean);
  
  const propertyAddress = addressParts.length > 0 ? addressParts.join(' ') : 'נכס';
  
  console.log('Address parts:', { street, buildingNumber, apartmentNumber, propertyCity });
  console.log('Final property address:', propertyAddress);
  
  const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>הזמנה לחתימה דיגיטלית על חוזה שכירות</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;600;700&display=swap');
        
        * {
          direction: rtl;
          text-align: right;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Noto Sans Hebrew', Arial, sans-serif;
          background-color: #f5f5f5;
          direction: rtl;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          text-align: center;
          padding: 40px 20px 20px;
          background: linear-gradient(135deg, #38E18E 0%, #2bc77a 100%);
        }
        
        .logo {
          display: inline-block;
          max-width: 200px;
          height: auto;
        }
        
        .main-content {
          padding: 40px 30px;
          text-align: center;
        }
        
        .title {
          font-size: 28px;
          font-weight: 700;
          color: #281D57;
          margin-bottom: 20px;
          line-height: 1.2;
        }
        
        .description {
          font-size: 16px;
          color: #374151;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        
        .contract-details {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          border: 1px solid #e5e7eb;
        }
        
        .contract-details h3 {
          margin: 0 0 15px 0;
          color: #281D57;
          font-size: 18px;
          font-weight: 600;
        }
        
        .contract-details p {
          margin: 8px 0;
          color: #374151;
        }
        
        .sign-button {
          display: inline-block;
          background-color: #38E18E;
          color: #281D57;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 30px 0;
          transition: background-color 0.3s;
        }
        
        .sign-button:hover {
          background-color: #2bc77a;
        }
        
        .footer {
          background-color: #f8fafc;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        
        .disclaimer {
          font-size: 12px;
          color: #9ca3af;
          line-height: 1.4;
          margin-top: 20px;
          padding: 15px;
          background-color: #fefefe;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .expiry-notice {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
        
        @media (max-width: 600px) {
          .email-container {
            margin: 10px;
            border-radius: 8px;
          }
          
          .main-content {
            padding: 30px 20px;
          }
          
          .title {
            font-size: 24px;
          }
          
          .description {
            font-size: 14px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1 style="color: white; margin: 0; font-size: 24px;">GreenLease</h1>
        </div>
        
        <div class="main-content">
          <h1 class="title">הזמנה לחתימה דיגיטלית</h1>
          
          <p class="description">
            שלום ${signer.name},<br>
            התקבלה הזמנה לחתום על חוזה שכירות דיגיטלית.
          </p>
          
          <div class="contract-details">
            <h3>פרטי החוזה:</h3>
            <p><strong>כתובת הנכס:</strong> ${propertyAddress}</p>
            <p><strong>תפקיד:</strong> ${signer.role}</p>
            <p><strong>תאריך יצירה:</strong> ${new Date().toLocaleDateString('he-IL')}</p>
          </div>
          
          <a href="${signUrl}" class="sign-button">
            לחץ כאן לחתימה דיגיטלית
          </a>
          
          <div class="expiry-notice">
            <strong>חשוב:</strong> הקישור תקף ל-7 ימים בלבד
          </div>
          
          <p class="description">
            לאחר החתימה, תקבל עותק של החוזה החתום למייל שלך.
          </p>
        </div>
        
        <div class="footer">
          <div class="disclaimer">
            להזכירך: השירות שלנו אינו מהווה ייעוץ משפטי, והאחריות על השימוש במסמך היא שלך בלבד.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log('Sending email with details:', {
    from: `"GreenLease" <${process.env.GMAIL_USER}>`,
    to: signer.email,
    subject: `הזמנה לחתימה דיגיטלית - כתובת הנכס: ${propertyAddress}`,
    hasHtml: !!emailHtml,
    hasAttachments: true
  });
  
  const result = await transporter.sendMail({
    from: `"GreenLease" <${process.env.GMAIL_USER}>`,
    to: signer.email,
    subject: `הזמנה לחתימה דיגיטלית - כתובת הנכס: ${propertyAddress}`,
    html: emailHtml,
    // Temporarily remove attachments to test if that's causing the issue
    // attachments: [
    //   {
    //     filename: 'logo@2x.png',
    //     path: './public/logo@2x.png',
    //     cid: 'logo@2x.png'
    //   }
    // ]
  });
  
  console.log('✓ Email sent successfully:', {
    messageId: result.messageId,
    to: signer.email
  });
} 