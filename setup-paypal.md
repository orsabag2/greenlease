# PayPal Production Setup Guide

## Current Issue
Your PayPal integration is currently using the sandbox/test environment, which is why you're being redirected to `sandbox.paypal.com`.

## Solution Steps

### 1. Get Your Production PayPal Client ID

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in to your PayPal account
3. Navigate to "My Apps & Credentials"
4. Create a new app or use an existing one
5. **Important**: Make sure you're using the **Live** environment (not Sandbox)
6. Copy your **Live Client ID**

### 2. For Local Development

Create a `.env.local` file in your project root with:

```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_live_paypal_client_id_here
```

### 3. For Production (Vercel)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name**: `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   - **Value**: Your live PayPal client ID
   - **Environment**: Production (and Preview if you want)

### 4. Verify Setup

After setting the environment variable:
- The yellow warning message should disappear
- PayPal should redirect to `www.paypal.com` instead of `sandbox.paypal.com`
- Payments will be processed in the live environment

### 5. Test the Integration

1. Deploy your changes to production
2. Test the payment flow with a small amount
3. Verify that payments are processed in the live environment

## Security Notes

- Never commit your `.env.local` file to version control
- The `NEXT_PUBLIC_` prefix makes the variable available in the browser (required for PayPal)
- Keep your PayPal credentials secure 