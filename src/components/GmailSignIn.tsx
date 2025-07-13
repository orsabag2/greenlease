import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';

const GmailSignIn: React.FC = () => {
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // For now, just log the user info
      console.log('Signed in user:', user);
      // Removed alert on successful login
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert('Google sign-in failed.');
    }
  };

  return (
    <button
      onClick={handleSignIn}
      style={{
        background: '#fff',
        color: '#124E31',
        border: '2px solid #38E18E',
        borderRadius: 8,
        padding: '12px 24px',
        fontWeight: 600,
        fontSize: 16,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 2px 8px #38E18E22',
      }}
    >
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 24, height: 24 }} />
      התחבר עם ג׳ימייל
    </button>
  );
};

export default GmailSignIn; 