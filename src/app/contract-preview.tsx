// Add this module declaration to suppress TS error for html2pdf.js
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import html2pdf from 'html2pdf.js';
import React, { useEffect, useState } from 'react';

// Extend the Window interface to include html2pdf
declare global {
  interface Window {
    html2pdf?: unknown;
  }
}

// Declare html2pdf on the window object for TypeScript
if (typeof window !== 'undefined') {
  window.html2pdf = window.html2pdf || undefined;
}

export default function ContractPreviewPage() {
  const [contract, setContract] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setContract(localStorage.getItem('contractText') || '');
    }
  }, []);

  function enhanceContract(text: string) {
    // Bold section numbers and titles (e.g., 1. ... , 2. ...)
    text = text.replace(/(\d+\.[^<\n]*)/g, (m) => {
      return m.replace(/^(\d+\.)/, '<span class="section-title">$1</span>');
    });
    // Highlight key words
    const keywords = ['הואיל', 'המשכיר', 'השוכר', 'הצדדים', 'הסכם', 'הנכס', 'הבטחונות', 'הערבים', 'הפיקדון', 'המחסן', 'החניה'];
    function escapeRegExp(string: string) {
      return string.replace(/[.*+?^$()|[\\]\\]/g, '\\$&');
    }
    keywords.forEach(word => {
      const re = new RegExp('(?<![\\w-])(' + escapeRegExp(word) + ')(?![\\w-])', 'g');
      text = text.replace(re, '<span class="highlight">$1</span>');
    });
    return text;
  }

  const handleDownloadPDF = () => {
    const element = document.getElementById('contract-page');
    if (element) {
      html2pdf().from(element).save('contract.pdf');
    }
  };

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 0' }}>
      <style>{`
        .contract-container { position: relative; width: 700px; }
        .page { background: #fff; width: 700px; min-height: 990px; box-shadow: 0 2px 12px rgba(0,0,0,0.10); border-radius: 6px; padding: 32px 32px 32px 32px; font-family: var(--font-frank-ruhl), 'Noto Sans Hebrew', 'Segoe UI', Arial, sans-serif; color: #222; font-size: 1rem; line-height: 1.5; direction: rtl; position: relative; }
        .contract-title { font-size: 1.4rem; font-weight: bold; margin-bottom: 18px; text-align: center; }
        .contract-preview { font-size: 1rem; font-weight: 500; }
        .section-title { font-weight: bold; font-size: 1.05rem; margin-top: 1.2em; margin-bottom: 0.3em; }
        .highlight { font-weight: bold; color: #2563eb; }
        @media print { button { display: none; } @page { margin: 0; } body { margin: 0; } }
        .action-btn { position: absolute; top: 16px; right: 16px; z-index: 1000; padding: 8px 18px; font-size: 1rem; background: #2563eb; color: #fff; border: none; border-radius: 5px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); cursor: pointer; transition: background 0.2s; margin-left: 8px; }
        .action-btn:hover { background: #1d4ed8; }
        .action-btn.pdf { right: 140px; left: auto; }
      `}</style>
      <div className="contract-container">
        <button className="action-btn" onClick={() => window.print()}>הדפס</button>
        <button className="action-btn pdf" onClick={handleDownloadPDF}>הורד PDF</button>
        <div className="page" id="contract-page">
          <div className="contract-title">הסכם שכירות</div>
          <div className="contract-preview" dangerouslySetInnerHTML={{ __html: contract ? enhanceContract(contract.trim().replace(/\n{2,}/g, '<br/>').replace(/([^>])\n+/g, '$1')) : '<span style=\"color:red\">לא נמצא תוכן חוזה להצגה</span>' }} />
        </div>
      </div>
    </div>
  );
} 