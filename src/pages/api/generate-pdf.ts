import type { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { html, css } = req.body;
  if (!html) {
    res.status(400).json({ error: 'Missing HTML' });
    return;
  }

  try {
    // Use serverless-compatible Chromium in production
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
    });
    const page = await browser.newPage();

    // Combine HTML and CSS
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contract.pdf');
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Puppeteer PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed', details: error instanceof Error ? error.message : error });
  }
} 