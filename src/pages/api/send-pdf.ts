import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { html, css, email } = req.body;
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
      subject: 'הסכם שכירות - GreenLease',
      text: 'מצורף קובץ PDF של החוזה שלך.',
      attachments: [
        {
          filename: 'contract.pdf',
          content: pdfBuffer,
        },
      ],
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Send PDF email error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error instanceof Error ? error.message : error });
  }
} 