import React from 'react';

interface Props {
  contractText: string;
}

const ContractPreview: React.FC<Props> = ({ contractText }) => (
  <div
    className="border rounded p-6 bg-white shadow text-right font-serif whitespace-pre-line leading-relaxed"
    dir="rtl"
    style={{ fontSize: '1.1rem', minHeight: 300, color: '#111', fontWeight: 600 }}
  >
    {contractText}
  </div>
);

export default ContractPreview; 