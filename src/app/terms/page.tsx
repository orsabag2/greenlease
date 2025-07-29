'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
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
            תנאי השימוש – GreenLease
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
          ברוכים הבאים ל־GreenLease. השימוש באתר ובשירות כפוף לתנאים הבאים:
        </p>

        {/* Terms Sections */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              1. השירות
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              GreenLease מאפשר לבעלי דירות ליצור חוזה שכירות דיגיטלי בהתבסס על שאלון פשוט. בסיום התהליך נוצר קובץ חוזה מותאם אישית בפורמט PDF.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              2. אין ייעוץ משפטי
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              השירות אינו מהווה ייעוץ משפטי, אינו מחליף עורך דין, ואינו מתאים למקרים מורכבים או חריגים. השימוש במסמך שנוצר הוא באחריות המשתמש בלבד.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              3. שימוש אישי בלבד
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              השירות נועד לשימוש אישי עבור בעלי דירות בלבד. אין להעתיק, להפיץ, למכור או לעשות שימוש חוזר בחוזים או במערכת ללא אישור מפורש בכתב.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              4. תשלום
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              הגישה לקובץ החוזה כרוכה בתשלום חד־פעמי של 99 ₪. אין חיובים חוזרים, ואין החזרים לאחר יצירת הקובץ.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              5. הגבלת אחריות
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              GreenLease אינה אחראית לנזק ישיר או עקיף הנגרם מהשימוש בשירות או בתכנים שנוצרו באמצעותו. כל שימוש בחוזה הוא על אחריות המשתמש בלבד.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              6. שינויים בשירות
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              החברה רשאית לעדכן את השירות, התכנים, או תנאי השימוש בכל עת.
            </p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#281D57',
              marginBottom: '12px'
            }}>
              7. שיפוט וסמכות
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}>
              השימוש בשירות כפוף לדיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בעיר תל אביב.
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