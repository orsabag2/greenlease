import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { testEmail } = req.body;

  if (!testEmail) {
    res.status(400).json({ error: 'Missing test email address' });
    return;
  }

  try {
    console.log('=== EMAIL TEST STARTED ===');
    console.log('GMAIL_USER configured:', !!process.env.GMAIL_USER);
    console.log('GMAIL_PASS configured:', !!process.env.GMAIL_PASS);
    console.log('Test email:', testEmail);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      throw new Error('Gmail credentials not configured');
    }

    // Create transporter with more detailed configuration
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
      // Add timeout and other settings
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });

    // Verify connection configuration
    console.log('Verifying transporter configuration...');
    await transporter.verify();
    console.log('✓ Transporter verified successfully');

    // Send test email
    const testEmailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>בדיקת אימייל</title>
      </head>
      <body>
        <h1>בדיקת אימייל מ-GreenLease</h1>
        <p>אם אתה רואה את ההודעה הזו, זה אומר שהאימייל עובד!</p>
        <p>זמן הבדיקה: ${new Date().toLocaleString('he-IL')}</p>
      </body>
      </html>
    `;

    console.log('Sending test email...');
    const result = await transporter.sendMail({
      from: `"GreenLease Test" <${process.env.GMAIL_USER}>`,
      to: testEmail,
      subject: 'בדיקת אימייל - GreenLease',
      html: testEmailHtml,
    });

    console.log('✓ Test email sent successfully');
    console.log('Message ID:', result.messageId);

    res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('✗ Email test failed:', error);
    
    // Provide specific error guidance
    let errorMessage = 'Email sending failed';
    let solution = '';
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid login')) {
        errorMessage = 'Invalid Gmail credentials';
        solution = 'Please check your GMAIL_USER and GMAIL_PASS environment variables. You may need to use an App Password instead of your regular password.';
      } else if (error.message.includes('Username and Password not accepted')) {
        errorMessage = 'Gmail authentication failed';
        solution = 'You need to enable 2-factor authentication and create an App Password for this application.';
      } else if (error.message.includes('Less secure app access')) {
        errorMessage = 'Less secure app access is disabled';
        solution = 'Gmail has disabled less secure app access. You must use an App Password instead.';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({ 
      error: errorMessage,
      solution,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
