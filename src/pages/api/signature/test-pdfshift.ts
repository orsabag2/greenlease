import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  console.log('Testing PDFShift API...');
  console.log('PDFShift API Key exists:', !!process.env.PDFSHIFT_API_KEY);
  console.log('PDFShift API Key (first 10 chars):', process.env.PDFSHIFT_API_KEY?.substring(0, 10) + '...');

  if (!process.env.PDFSHIFT_API_KEY) {
    res.status(400).json({ error: 'PDFShift API key not found' });
    return;
  }

  try {
    // Test with a simple HTML
    const testHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
          </style>
        </head>
        <body>
          <h1>PDFShift Test</h1>
          <p>This is a test to verify the PDFShift API is working.</p>
          <p>Time: ${new Date().toISOString()}</p>
        </body>
      </html>
    `;

    console.log('Sending test request to PDFShift...');
    
    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PDFSHIFT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: testHtml,
        format: 'A4',
        margin: '1cm',
        landscape: false
      }),
    });

    console.log('PDFShift response status:', pdfResponse.status);
    console.log('PDFShift response headers:', Object.fromEntries(pdfResponse.headers.entries()));

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.log('PDFShift test failed:', errorText);
      res.status(500).json({ 
        error: 'PDFShift API test failed', 
        status: pdfResponse.status,
        statusText: pdfResponse.statusText,
        details: errorText
      });
      return;
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('PDFShift test successful, PDF size:', pdfBuffer.byteLength);

    res.status(200).json({
      success: true,
      message: 'PDFShift API is working correctly',
      pdfSize: pdfBuffer.byteLength,
      status: pdfResponse.status
    });

  } catch (error) {
    console.error('Error testing PDFShift:', error);
    res.status(500).json({ 
      error: 'Failed to test PDFShift API', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
