import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
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
    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    const fullHtml = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>${css || ''}</style>
        </head>
        <body dir="rtl">
          ${html}
        </body>
      </html>
    `;
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '2.5cm', bottom: '2.5cm', left: '1.5cm', right: '1.5cm' },
      displayHeaderFooter: false,
    });
    await browser.close();

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