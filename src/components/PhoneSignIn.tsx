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

  useEffect(() => {
    // Initialize reCAPTCHA when component mounts
    if (recaptchaRef.current && !isInitializedRef.current) {
      try {
        recaptchaVerifierRef.current = initializeRecaptcha('recaptcha-container');
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize reCAPTCHA:', error);
      }
    }

    return () => {
      // Clean up reCAPTCHA safely
      if (recaptchaVerifierRef.current && isInitializedRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (error) {
          // Ignore cleanup errors as they're not critical
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

    // Format phone number for Israel (+972)
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

      // For invisible reCAPTCHA, we need to call verify() first
      const recaptchaResult = await recaptchaVerifierRef.current.verify();
      console.log('reCAPTCHA verification result:', recaptchaResult);

      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhone, 
        recaptchaVerifierRef.current
      );
      
      setVerificationId(confirmationResult.verificationId);
      setStep('code');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Phone auth error:', error);
      
      // If reCAPTCHA fails, try to reinitialize it
      if (error.code === 'auth/invalid-app-credential') {
        try {
          // Clear and reinitialize reCAPTCHA
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
    
    // Reinitialize reCAPTCHA when resetting
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
      background: '#fff',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxWidth: 400,
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
                padding: '4px 8px',
                background: '#c33',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer'
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
            disabled={isLoading || !phoneNumber}
            style={{
              width: '100%',
              padding: 12,
              background: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'שולח...' : 'שלח קוד אימות'}
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
              padding: 12,
              background: isLoading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginBottom: 12
            }}
          >
            {isLoading ? 'מאמת...' : 'אמת קוד'}
          </button>

          <button
            onClick={resetForm}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 8,
              background: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 14,
              cursor: isLoading ? 'not-allowed' : 'pointer'
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