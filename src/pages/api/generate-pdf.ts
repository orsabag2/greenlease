import type { NextApiRequest, NextApiResponse } from 'next';

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
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contract.pdf');
    res.end(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'PDF generation failed', details: error instanceof Error ? error.message : error });
  }
} 