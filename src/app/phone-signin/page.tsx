'use client';

import React from 'react';
import PhoneSignIn from '../../components/PhoneSignIn';
import Link from 'next/link';

const PhoneSignInPage: React.FC = () => {
  const handlePhoneSignInSuccess = (user: any) => {
    console.log('✅ Phone sign-in successful!');
    console.log('Signed in user:', user);
    // You can add navigation logic here if needed
  };

  const handlePhoneSignInError = (error: any) => {
    console.error('❌ Phone sign-in error:', error);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 120px)',
      padding: '40px 20px',
      background: '#F8F8FC',
      direction: 'rtl'
    }}>
      {/* Main Content Card */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '40px 32px',
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 4px 32px rgba(0,0,0,0.1)',
        fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
        direction: 'rtl',
        textAlign: 'right'
      }}>
        {/* Header */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#281D57',
          marginBottom: '32px',
          textAlign: 'center',
          lineHeight: '1.3',
          direction: 'rtl'
        }}>
          התחברות עם טלפון
        </h1>

        {/* Phone Authentication Component */}
        <PhoneSignIn 
          onSuccess={handlePhoneSignInSuccess}
          onError={handlePhoneSignInError}
        />

        {/* Back to Login Link */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px'
        }}>
          <Link 
            href="/"
            style={{
              color: '#4A1D96',
              textDecoration: 'underline',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ← חזור להתחברות עם Gmail
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PhoneSignInPage; 