import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';

const GmailSignIn: React.FC = () => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const handleSignIn = async () => {
    if (!termsAccepted || !disclaimerAccepted) {
      alert('עליך לאשר את תנאי השימוש והמדיניות הפרטיות כדי להמשיך');
      return;
    }

    console.log('Starting Google sign-in...');
    console.log('Current domain:', window.location.hostname);
    console.log('Firebase auth domain:', auth.config.authDomain);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Signed in user:', user);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'auth/popup-closed-by-user') {
        alert('החלון נסגר. אנא נסה שוב.');
      } else if (error.code === 'auth/popup-blocked') {
        alert('החלון נחסם על ידי הדפדפן. אנא אפשר חלונות קופצים עבור האתר הזה.');
      } else if (error.code === 'auth/unauthorized-domain') {
        alert('הדומיין לא מורשה. אנא בדוק את הגדרות Firebase.');
      } else {
        alert(`שגיאה בהתחברות: ${error.message}`);
      }
    }
  };

  const isButtonDisabled = !termsAccepted || !disclaimerAccepted;

  return (
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
              paddingLeft: '20px',
              position: 'relative',
              textAlign: 'right',
              direction: 'rtl'
            }}>
              <span style={{
                position: 'absolute',
                left: 0,
                top: '6px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#4A1D96'
              }}></span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Checkboxes */}
      <div style={{ marginBottom: '32px', direction: 'rtl' }}>
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: '16px',
          cursor: 'pointer',
          fontSize: '14px',
          lineHeight: '1.4',
          direction: 'rtl',
          textAlign: 'right'
        }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={{
              marginRight: '12px',
              marginTop: '2px',
              width: '18px',
              height: '18px',
              accentColor: '#4A1D96',
              flexShrink: 0
            }}
          />
          <span style={{ color: '#000', textAlign: 'right' }}>
            קראתי ואני מסכים/ה ל
            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>תנאי השימוש</span>
            ו
            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>מדיניות הפרטיות</span>
          </span>
        </label>

        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          cursor: 'pointer',
          fontSize: '14px',
          lineHeight: '1.4',
          direction: 'rtl',
          textAlign: 'right'
        }}>
          <input
            type="checkbox"
            checked={disclaimerAccepted}
            onChange={(e) => setDisclaimerAccepted(e.target.checked)}
            style={{
              marginRight: '12px',
              marginTop: '2px',
              width: '18px',
              height: '18px',
              accentColor: '#4A1D96',
              flexShrink: 0
            }}
          />
          <span style={{ color: '#000', textAlign: 'right' }}>
            אני מבין/ה ומסכים/ה לכך ש־GreenLease אינה מספקת ייעוץ משפטי, ואינה אחראית לתוקפו המשפטי של החוזה או להתאמתו למקרים מיוחדים. השימוש בשירות הוא באחריות המשתמש בלבד, והחוזה מיועד למצבים שכיחים של השכרת דירות בלבד.
          </span>
        </label>
      </div>

      {/* Sign In Button */}
      <button
        onClick={handleSignIn}
        disabled={isButtonDisabled}
        style={{
          width: '100%',
          padding: '16px 24px',
          border: '2px solid #E5E7EB',
          borderRadius: '12px',
          background: isButtonDisabled ? '#F3F4F6' : '#fff',
          color: isButtonDisabled ? '#9CA3AF' : '#000',
          fontSize: '16px',
          fontWeight: 500,
          cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          transition: 'all 0.2s ease',
          fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
          direction: 'rtl'
        }}
      >
        <span style={{ direction: 'rtl' }}>התחבר עם Gmail</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </button>
    </div>
  );
};

export default GmailSignIn; 