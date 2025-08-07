import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const envCheck = {
    PDFSHIFT_API_KEY: !!process.env.PDFSHIFT_API_KEY,
    GMAIL_USER: !!process.env.GMAIL_USER,
    GMAIL_PASS: !!process.env.GMAIL_PASS,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  };

  console.log('Environment check:', envCheck);

  res.status(200).json({
    message: 'Environment variables check',
    env: envCheck
  });
}
