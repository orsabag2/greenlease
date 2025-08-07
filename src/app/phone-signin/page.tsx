'use client';

import React, { useEffect, useState } from 'react';
import PhoneSignIn from '../../components/PhoneSignIn';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '../../utils/firebase';
import type { User } from 'firebase/auth';

const PhoneSignInPage: React.FC = () => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        console.log('✅ User authenticated, redirecting to main app');
        
        // For phone users, ensure we redirect to a clean main page
        const isPhoneUser = user.providerData.some(provider => provider.providerId === 'phone');
        if (isPhoneUser) {
          // Clear any URL parameters to ensure clean start
          router.push('/');
        } else {
          // For Gmail users, normal redirect
          router.push('/');
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handlePhoneSignInSuccess = (user: any) => {
    console.log('✅ Phone sign-in successful!');
    console.log('Signed in user:', user);
    
    // Only clear localStorage if user is not editing from dashboard
    const editingFromDashboard = localStorage.getItem('editingFromDashboard') === 'true';
    const contractId = localStorage.getItem('currentContractId');
    
    if (!editingFromDashboard && !contractId) {
      // Fresh phone sign-in - clear localStorage to ensure fresh start
      localStorage.removeItem('contractMeta');
      localStorage.removeItem('contractStep');
      localStorage.removeItem('contractInnerStep');
      localStorage.removeItem('currentContractId');
      localStorage.removeItem('editingFromDashboard');
      
      // Clear session flags
      sessionStorage.removeItem('hasCheckedUnfinishedContract');
      localStorage.removeItem('hasCheckedUnfinishedContract');
      sessionStorage.removeItem('modalLastShownTime');
      
      console.log('✅ Cleared localStorage for fresh phone user experience');
    } else {
      // Phone user editing from dashboard - preserve contract data
      console.log('✅ Phone user editing from dashboard - preserving contract data');
      console.log('✅ Contract ID:', contractId);
      console.log('✅ Editing from dashboard flag:', editingFromDashboard);
    }
    
    // The redirect will happen automatically via onAuthStateChanged
  };

  const handlePhoneSignInError = (error: any) => {
    console.error('❌ Phone sign-in error:', error);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgb(248, 248, 252)',
      direction: 'rtl'
    }} className="phone-login-page-container">
      {/* Header */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: isMobile ? '16px 20px' : '20px 20px',
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
              width: isMobile ? '120px' : '200px', 
              height: isMobile ? '24px' : '32px' 
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
        minHeight: isMobile ? 'calc(100vh - 80px)' : 'calc(100vh - 100px)',
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