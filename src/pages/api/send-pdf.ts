import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { html, css, email, propertyAddress } = req.body;
  if (!html || !email) {
    res.status(400).json({ error: 'Missing HTML or email' });
    return;
  }

  try {
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

    // PDFShift options for A4 and margins
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

    let pdfBuffer;
    try {
      const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'sk_e0e70090e19433315fd54ce22045e16600e7bf2f',
        },
        body: JSON.stringify(pdfShiftOptions),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('PDFShift API error: ' + errorText);
      }
      pdfBuffer = Buffer.from(await response.arrayBuffer());
    } catch (fetchError) {
      console.error('Fetch to PDFShift failed:', fetchError);
      throw new Error('PDF generation failed');
    }

    // Create beautiful HTML email template
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>החוזה שלך מוכן!</title>
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
              font-size: 16px;
            }
            
            .illustration img {
              max-height: 200px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1 style="color: #281D57; margin: 0; font-size: 24px;">GreenLease</h1>
          </div>
          
          <div class="main-content">
            <div class="illustration">
              <div style="font-size: 48px; margin: 20px 0;">📄</div>
            </div>
            
            <h1 class="title">החוזה שלך מוכן!</h1>
            
            <p class="description">
              סיימנו לבנות את חוזה השכירות שלך בהתאם לפרטים שמילאת.
            </p>
            
            <p class="instructions">
              מצורף קובץ PDF עם החוזה, מוכן להדפסה ולחתימה מול השוכר. מומלץ לקרוא אותו בעיון לפני החתימה, ולשמור עותק לעתיד.
            </p>
          </div>
          
          <div class="footer">
            <div class="signature">בהצלחה בהשכרה,</div>
            <div class="team-name">צוות GreenLease</div>
            
            <div class="disclaimer">
              להזכירך: השירות שלנו אינו מהווה ייעוץ משפטי, והאחריות על השימוש במסמך היא שלך בלבד.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with Nodemailer (using Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: propertyAddress ? `החוזה שלך מ־GreenLease להשכרת הדירה ב־${propertyAddress} מוכן להורדה` : 'החוזה שלך מ־GreenLease מוכן להורדה',
      html: emailHtml,
      attachments: [
        {
          filename: 'contract.pdf',
          content: pdfBuffer,
        },
        // Temporarily remove image attachments to test if that's causing the issue
        // {
        //   filename: 'logo@2x.png',
        //   path: './public/logo@2x.png',
        //   cid: 'logo@2x.png'
        // },
        // {
        //   filename: 'ready-for-sign.png',
        //   path: './public/ready-for-sign.png',
        //   cid: 'ready-for-sign.png'
        // }
      ],
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Send PDF email error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error instanceof Error ? error.message : error });
  }
} 