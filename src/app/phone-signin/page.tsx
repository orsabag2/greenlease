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
        {/* Illustration at the top */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <img
            src="/login-illustation.png"
            alt="Login Illustration"
            style={{
              maxWidth: '100%',
              height: 'auto',
              maxHeight: '200px'
            }}
          />
        </div>

        {/* Header */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#281D57',
          marginBottom: '16px',
          textAlign: 'center',
          lineHeight: '1.3',
          direction: 'rtl'
        }}>
          הצעד הראשון לחוזה שכירות - מתחיל כאן
        </h1>

        {/* Introductory Text */}
        <p style={{
          fontSize: '16px',
          color: '#000',
          marginBottom: '24px',
          lineHeight: '1.5',
          textAlign: 'center',
          direction: 'rtl'
        }}>
          עוד רגע תתחילו לענות על שאלון קצר. לפי התשובות, נבנה עבורכם חוזה שכירות מותאם אישית, מוכן להורדה.
        </p>

        {/* Preparation Section */}
        <div style={{ marginBottom: '32px', direction: 'rtl' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#000',
            marginBottom: '16px',
            textAlign: 'right'
          }}>
            כדי שהכול יתקתק, כדאי להכין כמה דברים מראש:
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            direction: 'rtl'
          }}>
            {[
              'שם השוכר ומספר תעודת זהות',
              'מתי מתחילים ומתי מסיימים',
              'כמה שכר דירה משלמים',
              'איזה ביטחונות תבקשו',
              'כל פרט חשוב שתרצו להכניס (כמו חניה, מחסן, בעלי חיים)'
            ].map((item, index) => (
              <li key={index} style={{
                fontSize: '14px',
                color: '#000',
                marginBottom: '8px',
                paddingRight: '24px',
                position: 'relative',
                textAlign: 'right',
                direction: 'rtl'
              }}>
                <svg
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '2px',
                    width: '16px',
                    height: '16px',
                    flexShrink: 0
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    fill="#38E18E"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Phone Authentication Component */}
        <div style={{
          border: '2px solid #E5E7EB',
          borderRadius: '12px',
          padding: '24px',
          background: '#fff',
          marginBottom: '16px'
        }}>
          <PhoneSignIn 
            onSuccess={handlePhoneSignInSuccess}
            onError={handlePhoneSignInError}
          />
        </div>

        {/* Back to Login Link */}
        <div style={{
          textAlign: 'center',
          marginTop: '16px'
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