import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithPhoneNumber, 
  signInWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier 
} from 'firebase/auth';
import { auth, initializeRecaptcha } from '../utils/firebase';

interface PhoneSignInProps {
  onSuccess?: (user: any) => void;
  onError?: (error: any) => void;
}

const PhoneSignIn: React.FC<PhoneSignInProps> = ({ onSuccess, onError }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const isInitializedRef = useRef(false);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    if (recaptchaRef.current && !isInitializedRef.current) {
      try {
        recaptchaVerifierRef.current = initializeRecaptcha('recaptcha-container');
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize reCAPTCHA:', error);
      }
    }

    return () => {
      if (recaptchaVerifierRef.current && isInitializedRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (error) {
          console.log('reCAPTCHA cleanup error (ignored):', error);
        }
        recaptchaVerifierRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setError('אנא הכנס מספר טלפון');
      return;
    }

    // Simple rate limiting
    if (attemptCount >= 3) {
      setError('יותר מדי ניסיונות. אנא המתן מספר דקות ונסה שוב.');
      return;
    }

    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        formattedPhone = '+972' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('972')) {
        formattedPhone = '+' + phoneNumber;
      } else {
        formattedPhone = '+972' + phoneNumber;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      if (!recaptchaVerifierRef.current) {
        throw new Error('reCAPTCHA לא זמין');
      }

      // Try to verify reCAPTCHA with minimal interaction
      try {
        // First try to render
        await recaptchaVerifierRef.current.render();
        
        // Then verify with a short timeout
        const verifyPromise = recaptchaVerifierRef.current.verify();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Verification timeout')), 5000)
        );
        
        await Promise.race([verifyPromise, timeoutPromise]);
      } catch (verifyError) {
        console.log('reCAPTCHA verification failed, trying alternative approach:', verifyError);
        
        // If reCAPTCHA fails, try to reinitialize and continue
        try {
          if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
          }
          recaptchaVerifierRef.current = initializeRecaptcha('recaptcha-container');
          
                   // Try one more time with the new instance
         if (recaptchaVerifierRef.current) {
           await recaptchaVerifierRef.current.verify();
         }
        } catch (retryError) {
          console.log('reCAPTCHA retry also failed:', retryError);
          // Continue anyway - Firebase might still work
        }
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone, 
        recaptchaVerifierRef.current || undefined
      );
      
      setVerificationId(confirmationResult.verificationId);
      setStep('code');
      setIsLoading(false);
      setAttemptCount(0); // Reset attempt count on success
    } catch (error: any) {
      console.error('Phone auth error:', error);
      setAttemptCount(prev => prev + 1);
      
      if (error.code === 'auth/invalid-app-credential' || error.message?.includes('reCAPTCHA')) {
        try {
          if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
          }
          recaptchaVerifierRef.current = initializeRecaptcha('recaptcha-container');
          setError('שגיאה באימות האבטחה. אנא נסה שוב.');
        } catch (reinitError) {
          console.error('Failed to reinitialize reCAPTCHA:', reinitError);
          setError('שגיאה באימות האבטחה. אנא רענן את הדף ונסה שוב.');
        }
      } else {
        setError(getErrorMessage(error.code));
      }
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('אנא הכנס קוד אימות');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const result = await signInWithCredential(auth, credential);
      
      if (onSuccess) {
        onSuccess(result.user);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(getErrorMessage(error.code));
      setIsLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-phone-number':
        return 'מספר טלפון לא תקין';
      case 'auth/invalid-verification-code':
        return 'קוד אימות לא תקין';
      case 'auth/code-expired':
        return 'קוד האימות פג תוקף, אנא שלח קוד חדש';
      case 'auth/too-many-requests':
        return 'יותר מדי בקשות, אנא נסה שוב מאוחר יותר';
      case 'auth/quota-exceeded':
        return 'חריגה ממכסה, אנא נסה שוב מאוחר יותר';
      case 'auth/internal-error':
        return 'שגיאה פנימית, אנא נסה שוב';
      case 'auth/operation-not-allowed':
        return 'אימות טלפון לא מופעל. אנא פנה למנהל המערכת להפעלת השירות.';
      case 'auth/invalid-app-credential':
        return 'שגיאה באימות האבטחה. אנא רענן את הדף ונסה שוב.';
      default:
        return 'שגיאה בהתחברות, אנא נסה שוב';
    }
  };

  const resetForm = () => {
    setPhoneNumber('');
    setVerificationCode('');
    setVerificationId('');
    setStep('phone');
    setError('');
    setIsLoading(false);
    setAttemptCount(0);
    
    if (recaptchaRef.current) {
      try {
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
        }
        recaptchaVerifierRef.current = initializeRecaptcha('recaptcha-container');
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to reinitialize reCAPTCHA on reset:', error);
      }
    }
  };

  return (
    <div className="phone-signin-container" style={{
      width: '100%'
    }}>
      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14
        }}>
          {error}
          {error.includes('אימות האבטחה') && (
            <button
              onClick={resetForm}
              style={{
                marginTop: 8,
                padding: '8px 16px',
                background: '#38E18E',
                color: '#281D57',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Noto Sans Hebrew, Arial, sans-serif'
              }}
            >
              נסה שוב
            </button>
          )}
        </div>
      )}

      {step === 'phone' ? (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 14,
              fontWeight: '500',
              color: '#555'
            }}>
              מספר טלפון
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="05X-XXXXXXX"
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 16,
                boxSizing: 'border-box'
              }}
              disabled={isLoading}
            />
          </div>

          {/* Invisible reCAPTCHA container - hidden but needed for verification */}
          <div 
            id="recaptcha-container" 
            ref={recaptchaRef}
            style={{ display: 'none' }}
          />

          <button
            onClick={handleSendCode}
            disabled={isLoading || !phoneNumber || attemptCount >= 3}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: isLoading || attemptCount >= 3 ? '#ccc' : '#38E18E',
              color: isLoading || attemptCount >= 3 ? '#666' : '#281D57',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading || attemptCount >= 3 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
              direction: 'rtl'
            }}
          >
            {isLoading ? 'שולח...' : attemptCount >= 3 ? 'יותר מדי ניסיונות' : 'שלח קוד אימות'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 14,
              fontWeight: '500',
              color: '#555'
            }}>
              קוד אימות
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="XXXXXX"
              maxLength={6}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 16,
                textAlign: 'center',
                letterSpacing: 4,
                boxSizing: 'border-box'
              }}
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleVerifyCode}
            disabled={isLoading || !verificationCode}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: isLoading ? '#ccc' : '#38E18E',
              color: isLoading ? '#666' : '#281D57',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginBottom: 12,
              transition: 'all 0.2s ease',
              fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
              direction: 'rtl'
            }}
          >
            {isLoading ? 'מאמת...' : 'אמת קוד'}
          </button>

          <button
            onClick={resetForm}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: 'transparent',
              color: '#666',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
              direction: 'rtl'
            }}
          >
            חזור לשלב הקודם
          </button>
        </div>
      )}
    </div>
  );
};

export default PhoneSignIn; 