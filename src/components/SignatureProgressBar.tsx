'use client';
import React, { useEffect, useState } from 'react';

interface SignatureStatus {
  role: string;
  name: string;
  status: 'not_sent' | 'sent' | 'signed' | 'expired';
  email: string;
  signerType: 'landlord' | 'tenant' | 'guarantor';
  signerId: string;
  invitationId?: string;
  signatureImage?: string | null;
}

interface SignatureProgressBarProps {
  contractId: string;
  compact?: boolean; // For smaller display in dashboard cards
}

export default function SignatureProgressBar({ contractId, compact = false }: SignatureProgressBarProps) {
  const [signers, setSigners] = useState<SignatureStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignatureStatus();
  }, [contractId]);

  const fetchSignatureStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/signature/status?contractId=${contractId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch signature status');
      }
      
      const data = await response.json();
      setSigners(data.signers || []);
    } catch (err) {
      console.error('Error fetching signature status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'sent':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
      case 'expired':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default: // 'not_sent'
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'text-green-600';
      case 'sent':
        return 'text-blue-500';
      case 'expired':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'signed':
        return 'חתם';
      case 'sent':
        return 'נשלח';
      case 'expired':
        return 'פג תוקף';
      default:
        return 'לא נשלח';
    }
  };

  const calculateProgress = () => {
    if (signers.length === 0) return 0;
    const signedCount = signers.filter(s => s.status === 'signed').length;
    return Math.round((signedCount / signers.length) * 100);
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${compact ? 'h-2' : 'h-4'}`}>
        <div className="bg-gray-200 rounded-full h-full"></div>
      </div>
    );
  }

  if (error || signers.length === 0) {
    return null; // Don't show anything if there's an error or no signers
  }

  const progress = calculateProgress();
  const signedCount = signers.filter(s => s.status === 'signed').length;
  const totalCount = signers.length;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>סטטוס חתימות</span>
          <span>{signedCount}/{totalCount} חתמו</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        {progress === 100 && (
          <div className="flex items-center text-xs text-green-600 font-medium">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            כל הצדדים חתמו
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-900">סטטוס חתימות</h4>
        <span className="text-sm text-gray-600">{signedCount}/{totalCount} חתמו</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className="bg-green-500 h-3 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="space-y-2">
        {signers.map((signer, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 space-x-reverse">
              {getStatusIcon(signer.status)}
              <span className="font-medium">{signer.role}</span>
              <span className="text-gray-600">({signer.name})</span>
            </div>
            <span className={`text-xs font-medium ${getStatusColor(signer.status)}`}>
              {getStatusText(signer.status)}
            </span>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center text-sm text-green-800">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">החוזה נחתם בהצלחה על ידי כל הצדדים!</span>
          </div>
        </div>
      )}
    </div>
  );
}
