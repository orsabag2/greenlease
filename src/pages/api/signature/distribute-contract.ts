import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== DISTRIBUTE CONTRACT API CALLED ===');
  console.log('Method:', req.method);
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contractId, signers, html, css, propertyAddress } = req.body;
  console.log('Parsed request - contractId:', contractId, 'signers count:', signers?.length, 'has html:', !!html, 'has css:', !!css, 'propertyAddress:', propertyAddress);

  if (!contractId || !signers || !html) {
    console.log('Missing required fields - contractId:', !!contractId, 'signers:', !!signers, 'html:', !!html);
    res.status(400).json({ error: 'Missing required fields (contractId, signers, html)' });
    return;
  }

  try {
    console.log('Starting distribute contract process for contractId:', contractId);
    
    // Check environment variables
    console.log('Environment check:');
    console.log('- GMAIL_USER:', !!process.env.GMAIL_USER);
    console.log('- GMAIL_PASS:', !!process.env.GMAIL_PASS);
    console.log('- PDFSHIFT_API_KEY:', !!process.env.PDFSHIFT_API_KEY);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      throw new Error('Email configuration missing (GMAIL_USER or GMAIL_PASS)');
    }

    if (!process.env.PDFSHIFT_API_KEY) {
      throw new Error('PDF generation service not configured (PDFSHIFT_API_KEY)');
    }

    // Use the same PDF generation approach as send-pdf.ts
    console.log('Preparing HTML for PDF generation...');
    
    // Google Fonts link for Frank Ruhl Libre
    const fontLink = `<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" rel="stylesheet">`;
    // Ensure font-family is set for contract-preview and .page
    const fontCss = `
      .contract-preview, .page, body {
        font-family: 'Frank Ruhl Libre', 'Noto Sans Hebrew', Arial, sans-serif !important;
      }
    `;
    
    // Prepare HTML with optional CSS and font
    let fullHtml = html;
    let fullCss = fontCss + (css || '');
    fullHtml = `<!DOCTYPE html><html><head>${fontLink}<style>${fullCss}</style></head><body>${html}</body></html>`;

    // PDFShift options for A4 and margins (same as send-pdf.ts)
    const pdfShiftOptions = {
      source: fullHtml,
      landscape: false, // Portrait A4
      margin: {
        top: '2.5cm',
        bottom: '2.5cm',
        left: '1.5cm',
        right: '1.5cm',
      },
    };

    console.log('Generating PDF with PDFShift...');
    let pdfBuffer;
    try {
      const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.PDFSHIFT_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pdfShiftOptions),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDFShift error:', errorText);
        throw new Error(`PDF generation failed: ${response.status} ${response.statusText}`);
      }

      pdfBuffer = await response.buffer();
      console.log('✓ PDF generated successfully, size:', pdfBuffer.length);
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Email HTML template for signed contract
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>החוזה החתום מוכן!</title>
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
            text-align: right;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            direction: rtl;
          }
          
          .header {
            text-align: center;
            padding: 40px 20px 20px;
            background: linear-gradient(135deg,rgb(255, 255, 255) 0%,rgb(255, 255, 255) 100%);
            direction: rtl;
          }
          
          .logo {
            display: inline-block;
            max-width: 200px;
            height: auto;
          }
          
          .main-content {
            padding: 40px 30px;
            text-align: center;
            direction: rtl;
          }
          
          .illustration {
            margin: 30px 0;
            text-align: center;
            direction: rtl;
          }
          
          .illustration img {
            max-width: 100%;
            height: auto;
            max-height: 300px;
          }
          
          .title {
            font-size: 32px;
            font-weight: 700;
            color: #1a365d;
            margin-bottom: 20px;
            line-height: 1.2;
            direction: rtl;
            text-align: center;
          }
          
          .description {
            font-size: 18px;
            color: #374151;
            line-height: 1.6;
            margin-bottom: 15px;
            direction: rtl;
            text-align: center;
          }
          
          .instructions {
            font-size: 16px;
            color: #6b7280;
            line-height: 1.5;
            margin-bottom: 30px;
            direction: rtl;
            text-align: center;
          }
          
          .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            direction: rtl;
          }
          
          .signature {
            font-size: 18px;
            font-weight: 600;
            color: #1a365d;
            margin-bottom: 8px;
            direction: rtl;
            text-align: center;
          }
          
          .team-name {
            font-size: 16px;
            color: #38E18E;
            font-weight: 600;
            direction: rtl;
            text-align: center;
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
            direction: rtl;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="cid:logo@2x.png" alt="GreenLease" class="logo">
          </div>
          
          <div class="main-content">
            <div class="illustration">
              <img src="cid:ready-for-sign.png" alt="החוזה החתום מוכן">
            </div>
            
            <h1 class="title">החוזה החתום מוכן!</h1>
            
            <p class="description">
              כל הצדדים חתמו על החוזה וכעת הוא מוכן לשימוש.
            </p>
            
            <p class="instructions">
              מצורף קובץ PDF עם החוזה החתום הסופי. שמור עותק לעתיד ובהצלחה!
            </p>
          </div>
          
          <div class="footer">
            <div class="signature">בהצלחה,</div>
            <div class="team-name">צוות GreenLease</div>
            
            <div class="disclaimer">
              להזכירך: השירות שלנו אינו מהווה ייעוץ משפטי, והאחריות על השימוש במסמך היא שלך בלבד.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with Nodemailer (same setup as send-pdf.ts)
    console.log('Setting up email transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // Send email to each signer
    console.log('Starting email distribution to', signers.length, 'signers');
    let sentCount = 0;
    
    for (const signer of signers) {
      if (signer.email && signer.email !== 'direct-sign@greenlease.me') {
        try {
          console.log('Sending email to:', signer.email, 'for signer:', signer.name);
          
          await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: signer.email,
            subject: propertyAddress ? `החוזה החתום מוכן - כתובת הנכס: ${propertyAddress}` : `החוזה החתום מוכן - ${contractId}`,
            html: emailHtml,
            attachments: [
              {
                filename: `חוזה_חתום_${contractId}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
              },
              {
                filename: 'logo@2x.png',
                path: './public/logo@2x.png',
                cid: 'logo@2x.png'
              },
              {
                filename: 'ready-for-sign.png',
                path: './public/ready-for-sign.png',
                cid: 'ready-for-sign.png'
              }
            ],
          });
          
          console.log('✓ Email sent successfully to:', signer.email);
          sentCount++;
        } catch (error) {
          console.error(`✗ Failed to send email to ${signer.email}:`, error);
        }
      } else {
        console.log('Skipping email for signer:', signer.name, 'email:', signer.email);
      }
    }

    console.log('Contract distribution completed. Emails sent:', sentCount);
    res.status(200).json({ 
      success: true, 
      message: 'Final contract distributed successfully',
      sentCount 
    });
    
  } catch (error) {
    console.error('=== ERROR IN DISTRIBUTE CONTRACT ===');
    console.error('Error type:', typeof error);
    console.error('Error instance:', error instanceof Error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error object:', error);
    }
    
    console.error('=== END ERROR LOG ===');
    
    res.status(500).json({ 
      error: 'Failed to distribute contract', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}