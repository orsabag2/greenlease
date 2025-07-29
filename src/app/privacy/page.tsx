'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F8FC',
      padding: '20px',
      direction: 'rtl'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.1)',
        fontFamily: 'Noto Sans Hebrew, Arial, sans-serif'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          borderBottom: '2px solid #E0E7EF',
          paddingBottom: '20px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#281D57',
            marginBottom: '8px'
          }}>
            🔐 מדיניות פרטיות – GreenLease
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#666',
            margin: 0
          }}>
            עודכן: יולי 2025
          </p>
        </div>

        {/* Introduction */}
        <p style={{
          fontSize: '18px',
          color: '#000',
          lineHeight: '1.6',
          marginBottom: '32px',
          textAlign: 'right'
        }}>
          GreenLease מחויבת לשמירה על פרטיות המשתמשים. להלן פירוט המדיניות:
        </p>

        {/* Privacy Sections */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              1. אילו פרטים נאספים?
            </h2>
            <ul style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0,
              paddingRight: '20px'
            }}>
              <li style={{ marginBottom: '8px' }}>
                פרטים שמוזנים בשאלון: כתובת הדירה, פרטי שוכר, תנאי החוזה.
              </li>
              <li style={{ marginBottom: '8px' }}>
                כתובת מייל (לשליחת הקובץ ולשמירת טיוטה).
              </li>
              <li style={{ marginBottom: '8px' }}>
                מידע טכני כללי (IP, סוג דפדפן) לצורכי אבטחה ותפקוד.
              </li>
            </ul>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              2. כיצד נעשה שימוש במידע?
            </h2>
            <ul style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0,
              paddingRight: '20px'
            }}>
              <li style={{ marginBottom: '8px' }}>
                יצירת חוזה מותאם אישית לפי הנתונים שנמסרו.
              </li>
              <li style={{ marginBottom: '8px' }}>
                שליחת הקובץ למייל של המשתמש.
              </li>
              <li style={{ marginBottom: '8px' }}>
                תמיכה ושיפור השירות.
              </li>
            </ul>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              3. אחסון ומחיקה
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              המידע נשמר בענן מאובטח (Firebase). כל משתמש רשאי לבקש מחיקה מלאה של פרטיו – באמצעות פנייה לכתובת: privacy@greenlease.me
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              4. שיתוף מידע
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              המידע לא יועבר, יימכר או ייחשף לצדדים שלישיים, למעט אם נדרש על פי חוק.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              5. שימוש בעוגיות (Cookies)
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              האתר עושה שימוש בקבצי עוגיות לשיפור חוויית המשתמש, אבטחה וסטטיסטיקה. ניתן לחסום עוגיות דרך הגדרות הדפדפן.
            </p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              6. עדכונים במדיניות
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              GreenLease שומרת לעצמה את הזכות לעדכן את מדיניות הפרטיות בכל עת.
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '2px solid #E0E7EF'
        }}>
          <Link href="/" style={{
            display: 'inline-block',
            backgroundColor: '#4A1D96',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 600,
            transition: 'background-color 0.2s'
          }}>
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
} 