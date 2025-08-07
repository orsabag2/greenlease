import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  console.log('Testing simple PDF generation...');
  console.log('PDFShift API Key exists:', !!process.env.PDFSHIFT_API_KEY);

  if (!process.env.PDFSHIFT_API_KEY) {
    res.status(400).json({ error: 'PDFShift API key not found' });
    return;
  }

  try {
    // Test with a very simple HTML
    const simpleHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
          </style>
        </head>
        <body>
          <h1>Simple Test</h1>
          <p>This is a simple test.</p>
        </body>
      </html>
    `;

    console.log('Sending simple HTML to PDFShift...');
    
    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PDFSHIFT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: simpleHtml,
        format: 'A4',
        margin: '1cm',
        landscape: false
      }),
    });

    console.log('PDFShift response status:', pdfResponse.status);

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.log('PDFShift simple test failed:', errorText);
      res.status(500).json({ 
        error: 'PDFShift API simple test failed', 
        status: pdfResponse.status,
        details: errorText
      });
      return;
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDFShift simple test successful, PDF size:', pdfBuffer.byteLength);

    // Return the PDF directly
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="simple_test.pdf"');
    res.setHeader('Content-Length', pdfBuffer.byteLength);
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Error testing simple PDF:', error);
    res.status(500).json({ 
      error: 'Failed to test simple PDF', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
