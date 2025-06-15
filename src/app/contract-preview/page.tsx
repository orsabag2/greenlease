'use client';
import React, { useEffect, useState } from 'react';

export default function ContractPreviewPage() {
  const [contract, setContract] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setContract(localStorage.getItem('contractText') || '');
      try {
        const t = JSON.parse(localStorage.getItem('contractTenants') || '[]');
        setTenants(Array.isArray(t) ? t : []);
      } catch {
        setTenants([]);
      }
    }
  }, []);

  function enhanceContract(text: string) {
    // Remove all ⸻ separators
    text = text.replace(/⸻+/g, '');
    // Bold all numbered list indices, including subclauses (e.g., 6.5, 4.2.1)
    text = text.replace(/(\d+)(\.(\d+))+\s/g, (m) => {
      return m.replace(/(\d+)/g, '<span class="num-bold">$1</span>');
    });
    // Also bold single-level numbered clauses (e.g., 1. ...)
    text = text.replace(/(\d+)\. /g, '<span class="num-bold">$1</span>. ');
    // Bold section titles (lines starting with a single-level number and a title)
    text = text.replace(/^(<span class=\"num-bold\">\d+<\/span>\. [^<\n]*)/gm, '<span class="section-title">$1</span>');
    // Highlight key words (now just bold/black)
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

  function injectAdditionalTenants(contract: string, tenants: any[]) {
    if (!tenants || tenants.length < 2) return contract;
    // Find the first occurrence of the main tenant block
    const regex = /(\nהשוכר: [^\n]+\n\(להלן: "השוכר"\)\n)/;
    const match = contract.match(regex);
    if (!match) return contract;
    const [fullMatch] = match;
    // Build extra tenants block
    const extra = tenants.slice(1).map((t, i) => {
      let line = 'השוכר: ';
      if (t.tenantName) line += t.tenantName;
      if (t.tenantIdNumber) line += `, ת"ז ${t.tenantIdNumber}`;
      if (t.tenantCity) line += `, עיר מגורים: ${t.tenantCity}`;
      if (t.tenantPhone) line += `, טלפון: ${t.tenantPhone}`;
      line += '\n(להלן: "השוכר")\n';
      return line;
    }).join('');
    // Insert after the first tenant block
    return contract.replace(regex, fullMatch + extra);
  }

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 0' }}>
      <style>{`
        .page {
          background: #fff;
          width: 794px;
          min-height: 1123px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          border-radius: 8px;
          padding: 60px 70px 60px 70px;
          font-family: var(--font-frank-ruhl), 'Noto Sans Hebrew', 'Segoe UI', Arial, sans-serif;
          color: #222;
          font-size: 1.1rem;
          line-height: 1.4;
          direction: rtl;
          position: relative;
        }
        .contract-title { font-size: 2rem; font-weight: bold; margin-bottom: 32px; text-align: center; }
        .contract-preview { font-size: 1.1rem; font-weight: 500; }
        .section-title { font-weight: bold; font-size: 1.15rem; margin-top: 2.2em; margin-bottom: 0.7em; }
        .highlight { font-weight: bold; color: #111; }
        .num-bold { font-weight: bold; }
        .contract-preview br { line-height: 0.7; }
        @media print {
          button { display: none; }
          @page { margin: 0; }
          body { margin: 0; }
          .page { box-shadow: none !important; }
        }
        .print-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 1000;
          padding: 12px 28px;
          font-size: 1.1rem;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: background 0.2s;
          margin-left: 12px;
        }
        .print-btn:hover { background: #1d4ed8; }
      `}</style>
      <div style={{ position: 'relative', width: 794 }}>
        <button className="print-btn" onClick={() => window.print()}>הדפס</button>
        <div className="page">
          <div className="contract-title">הסכם שכירות למגורים (שכירות בלתי מוגנת)</div>
          <div className="contract-preview" dangerouslySetInnerHTML={{ __html: contract ? enhanceContract(injectAdditionalTenants(contract, tenants)).replace(/\n/g, '<br/>') : '<span style=\"color:red\">לא נמצא תוכן חוזה להצגה</span>' }} />
        </div>
      </div>
    </div>
  );
} 