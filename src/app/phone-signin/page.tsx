'use client';

import React, { useEffect } from 'react';
import PhoneSignIn from '../../components/PhoneSignIn';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '../../utils/firebase';
import type { User } from 'firebase/auth';

const PhoneSignInPage: React.FC = () => {
  const router = useRouter();

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        console.log('✅ User authenticated, redirecting to main app');
        // Redirect directly to main app
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handlePhoneSignInSuccess = (user: any) => {
    console.log('✅ Phone sign-in successful!');
    console.log('Signed in user:', user);
    // The redirect will happen automatically via onAuthStateChanged
  };

  const handlePhoneSignInError = (error: any) => {
    console.error('❌ Phone sign-in error:', error);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8F8FC',
      direction: 'rtl'
    }}>
      {/* Header */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img 
            src="/logo.svg" 
            alt="GreenLease" 
            style={{ 
              width: '120px', 
              height: '24px' 
            }} 
          />
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: '40px 20px',
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
    </div>
  );
};

export default PhoneSignInPage; 