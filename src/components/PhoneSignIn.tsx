import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithPhoneNumber, 
  signInWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier 
} from 'firebase/auth';
import { auth, initializeRecaptcha, createMinimalRecaptcha } from '../utils/firebase';

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
  const [lastAttemptTime, setLastAttemptTime] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [recaptchaAttempts, setRecaptchaAttempts] = useState(0);
  // Removed suggestGmail state

  // Check if we're in cooldown period
  const isInCooldown = () => {
    return Date.now() < cooldownUntil;
  };

  // Get remaining cooldown time in seconds
  const getRemainingCooldown = () => {
    const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  };

  // Check if reCAPTCHA is being too aggressive
  const isRecaptchaTooAggressive = () => {
    return recaptchaAttempts >= 2;
  };

  // Initialize reCAPTCHA container
  useEffect(() => {
    // Ensure the reCAPTCHA container exists
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      container.style.display = 'none';
      document.body.appendChild(container);
      console.log('Created reCAPTCHA container');
    }

    return () => {
      // Simple cleanup on unmount
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (clearError) {
          console.log('Error clearing reCAPTCHA on unmount:', clearError);
        }
        recaptchaVerifierRef.current = null;
      }
      
      console.log('Component unmounting, reCAPTCHA cleaned up');
    };
  }, []);

  // Update cooldown display
  useEffect(() => {
    if (isInCooldown()) {
      const interval = setInterval(() => {
        if (!isInCooldown()) {
          setError('');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldownUntil]);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setError('אנא הכנס מספר טלפון');
      return;
    }

    // Check cooldown
    if (isInCooldown()) {
      const remaining = getRemainingCooldown();
      setError(`אנא המתן ${remaining} שניות לפני ניסיון נוסף`);
      return;
    }

    // Enhanced rate limiting
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTime;
    
    // If too many attempts in short time, enforce cooldown
    if (attemptCount >= 3) {
      const cooldownTime = Math.min(attemptCount * 60 * 1000, 10 * 60 * 1000); // 1-10 minutes
      setCooldownUntil(now + cooldownTime);
      setError(`יותר מדי ניסיונות. אנא המתן ${Math.ceil(cooldownTime / 1000 / 60)} דקות ונסה שוב.`);
      return;
    }

    // If attempts are too frequent, enforce short cooldown
    if (timeSinceLastAttempt < 30000) { // 30 seconds
      const remaining = Math.ceil((30000 - timeSinceLastAttempt) / 1000);
      setError(`אנא המתן ${remaining} שניות לפני ניסיון נוסף`);
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
    setLastAttemptTime(now);

    try {
      console.log('🔄 Attempting phone auth with invisible reCAPTCHA...');
      
      // Special bypass for your specific number that's causing endless reCAPTCHA
      if (formattedPhone === '+9725888322') {
        console.log('🔄 Special bypass for problematic number detected...');
        setError('מספר זה דורש אימות מורכב. אנא השתמש בהתחברות עם Gmail במקום.');
        setIsLoading(false);
        return;
      }
      
      // Create a completely hidden reCAPTCHA container
      const containerId = 'recaptcha-container';
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.display = 'none';
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.overflow = 'hidden';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-9999';
        document.body.appendChild(container);
      }
      
      // Clear any existing content
      container.innerHTML = '';
      
      // Clear any existing reCAPTCHA instances
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (clearError) {
          console.log('Error clearing existing reCAPTCHA:', clearError);
        }
        recaptchaVerifierRef.current = null;
      }
      
      // Create a completely invisible reCAPTCHA
      const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => console.log('Invisible reCAPTCHA solved'),
        'expired-callback': () => console.log('Invisible reCAPTCHA expired'),
        'error-callback': () => console.log('Invisible reCAPTCHA error'),
        // Force invisible behavior
        'badge': 'bottomright',
        'isolated': true,
        'render': 'explicit',
        'cleanup': true,
        // Additional invisible settings
        'data-size': 'invisible',
        'data-badge': 'bottomright',
        'data-isolated': true
      });
      
      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA לא זמין');
      }

      // Store the reference
      recaptchaVerifierRef.current = recaptchaVerifier;

      // Render the reCAPTCHA invisibly
      await recaptchaVerifier.render();
      console.log('✅ reCAPTCHA rendered invisibly');

      // Verify the reCAPTCHA invisibly
      await recaptchaVerifier.verify();
      console.log('✅ reCAPTCHA verified invisibly');

      // Attempt phone authentication
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      
      console.log('✅ Phone auth successful with invisible reCAPTCHA');
      setVerificationId(confirmationResult.verificationId);
      setStep('code');
      setIsLoading(false);
      setAttemptCount(0);
      
      // Clean up
      try {
        recaptchaVerifier.clear();
        recaptchaVerifierRef.current = null;
      } catch (cleanupError) {
        console.log('Error during cleanup:', cleanupError);
      }
      
    } catch (error: any) {
      console.error('Phone auth error:', error);
      setAttemptCount(prev => prev + 1);
      
      // Clean up on error
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch (cleanupError) {
          console.log('Error during cleanup:', cleanupError);
        }
      }
      
      // Handle different error types
      if (error.code === 'auth/invalid-app-credential' || error.message?.includes('reCAPTCHA') || error.code === 'auth/captcha-check-failed') {
        setRecaptchaAttempts(prev => prev + 1);
        
        // If reCAPTCHA is being too aggressive, suggest Gmail
        if (isRecaptchaTooAggressive()) {
          setError('מספר זה דורש אימות מורכב מדי. אנא השתמש בהתחברות עם Gmail במקום.');
        } else {
          setError('שגיאה באימות האבטחה. אנא נסה שוב.');
        }
      } else if (error.code === 'auth/too-many-requests') {
        // Handle Firebase rate limiting
        const cooldownTime = 5 * 60 * 1000; // 5 minutes
        setCooldownUntil(now + cooldownTime);
        setError('יותר מדי בקשות, אנא המתן 5 דקות ונסה שוב');
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
      case 'auth/captcha-check-failed':
        return 'שגיאה באימות האבטחה. אנא נסה שוב או השתמש בהתחברות עם Gmail.';
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
    setLastAttemptTime(0);
    setCooldownUntil(0);
    setRecaptchaAttempts(0);
    
    // Simple cleanup
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (clearError) {
        console.log('Error clearing reCAPTCHA on reset:', clearError);
      }
      recaptchaVerifierRef.current = null;
    }
    
    // Clear the container content
    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }
    
    console.log('Form reset, reCAPTCHA cleaned up');
  };

  // Add retry mechanism for failed attempts
  const handleRetry = () => {
    if (!isInCooldown()) {
      setError('');
      setAttemptCount(0);
      setLastAttemptTime(0);
      setCooldownUntil(0);
      setRecaptchaAttempts(0);
      
      // Simple cleanup
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (clearError) {
          console.log('Error clearing reCAPTCHA on retry:', clearError);
        }
        recaptchaVerifierRef.current = null;
      }
      
      // Clear the container content
      const container = document.getElementById('recaptcha-container');
      if (container) {
        container.innerHTML = '';
      }
      
      console.log('Retry initiated, reCAPTCHA cleaned up');
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
          {isInCooldown() && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              זמן המתנה: {getRemainingCooldown()} שניות
              <button
                onClick={handleRetry}
                disabled={isInCooldown()}
                style={{
                  marginLeft: 8,
                  padding: '4px 8px',
                  background: isInCooldown() ? '#ccc' : '#38E18E',
                  color: isInCooldown() ? '#666' : '#281D57',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: isInCooldown() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Noto Sans Hebrew, Arial, sans-serif'
                }}
              >
                נסה שוב
              </button>
            </div>
          )}
          {error.includes('אימות האבטחה') && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={resetForm}
                style={{
                  marginRight: 8,
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
            </div>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && phoneNumber && !isLoading && !isInCooldown() && attemptCount < 3) {
                  handleSendCode();
                }
              }}
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

          {/* reCAPTCHA container is created dynamically for each attempt */}

          <button
            onClick={handleSendCode}
            disabled={isLoading || !phoneNumber || isInCooldown() || attemptCount >= 3}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: isLoading || isInCooldown() || attemptCount >= 3 ? '#ccc' : '#38E18E',
              color: isLoading || isInCooldown() || attemptCount >= 3 ? '#666' : '#281D57',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading || isInCooldown() || attemptCount >= 3 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
              direction: 'rtl',
              position: 'relative'
            }}
          >
            {isLoading ? 'שולח...' : isInCooldown() || attemptCount >= 3 ? 'יותר מדי ניסיונות' : 'שלח קוד אימות'}
            {recaptchaVerified && !isLoading && (
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '12px',
                color: '#4CAF50'
              }}>
                ✓
              </span>
            )}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && verificationCode && !isLoading) {
                  handleVerifyCode();
                }
              }}
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