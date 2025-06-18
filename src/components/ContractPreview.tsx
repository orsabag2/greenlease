import React from 'react';

interface Props {
  contractText: string;
}

const ContractPreview: React.FC<Props> = ({ contractText }) => {
  // Split the contract text into summary and main sections
  const [summary, ...rest] = contractText.split('⸻');
  const mainContent = rest.join('⸻');

  return (
    <div className="flex flex-col gap-6">
      {/* Summary section */}
      {summary && (
        <div
          className="border rounded p-6 bg-white shadow text-right font-serif whitespace-pre-line leading-relaxed"
          dir="rtl"
          style={{ fontSize: '1.1rem', color: '#111', fontWeight: 600, backgroundColor: '#f8f9fa' }}
        >
          {summary.trim()}
        </div>
      )}

      {/* Main contract section */}
      <div
        className="border rounded p-6 bg-white shadow text-right font-serif whitespace-pre-line leading-relaxed"
        dir="rtl"
        style={{ fontSize: '1.1rem', color: '#111', fontWeight: 600 }}
      >
        {mainContent.trim()}
      </div>
    </div>
  );
};

export default ContractPreview; 