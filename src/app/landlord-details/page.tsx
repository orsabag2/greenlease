'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

interface LandlordDetails {
  landlordName: string;
  landlordId: string;
  landlordAddress: string;
  landlordPhone: string;
}

const LandlordDetailsPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<LandlordDetails>({
    landlordName: '',
    landlordId: '',
    landlordAddress: '',
    landlordPhone: ''
  });

  // Check authentication and load existing data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);
      setLoading(false);

      // Try to load existing landlord details
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.landlordDetails) {
            setDetails(userData.landlordDetails);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleInputChange = (field: keyof LandlordDetails, value: string) => {
    setDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validate required fields
    if (!details.landlordName.trim() || !details.landlordId.trim() || !details.landlordAddress.trim()) {
      alert('אנא מלא את כל השדות הנדרשים');
      return;
    }

    setSaving(true);

    try {
      // Save landlord details to user document
      await setDoc(doc(db, 'users', user.uid), {
        landlordDetails: details,
        updatedAt: new Date()
      }, { merge: true });

      console.log('✅ Landlord details saved successfully');
      
      // Redirect to main application
      router.push('/');
    } catch (error) {
      console.error('Error saving landlord details:', error);
      alert('שגיאה בשמירת הפרטים. אנא נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#F8F8FC'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>טוען...</div>
      </div>
    );
  }

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
          marginBottom: '8px',
          textAlign: 'center',
          lineHeight: '1.3',
          direction: 'rtl'
        }}>
          פרטי המשכיר
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '32px',
          direction: 'rtl'
        }}>
          בוא נתחיל ממך – כמה פרטים אישיים ונוכל להתקדם
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555'
            }}>
              איך קוראים לך? *
            </label>
            <input
              type="text"
              value={details.landlordName}
              onChange={(e) => handleInputChange('landlordName', e.target.value)}
              placeholder="לדוגמה: משה כהן"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {/* ID Number */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555'
            }}>
              מה מספר תעודת הזהות שלך? *
            </label>
            <input
              type="text"
              value={details.landlordId}
              onChange={(e) => handleInputChange('landlordId', e.target.value)}
              placeholder="לדוגמה: 123456789"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {/* Address */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555'
            }}>
              מה הכתובת שלך? *
            </label>
            <input
              type="text"
              value={details.landlordAddress}
              onChange={(e) => handleInputChange('landlordAddress', e.target.value)}
              placeholder="לדוגמה: אבן גבירול 10"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {/* Phone Number */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555'
            }}>
              מספר טלפון נוסף (אופציונלי)
            </label>
            <input
              type="tel"
              value={details.landlordPhone}
              onChange={(e) => handleInputChange('landlordPhone', e.target.value)}
              placeholder="לדוגמה: 050-1234567"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              background: saving ? '#ccc' : '#38E18E',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              marginBottom: '16px'
            }}
          >
            {saving ? 'שומר...' : 'המשך'}
          </button>
        </form>

        {/* Back Link */}
        <div style={{
          textAlign: 'center'
        }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              color: '#4A1D96',
              border: 'none',
              textDecoration: 'underline',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ← חזור להתחברות
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandlordDetailsPage; 