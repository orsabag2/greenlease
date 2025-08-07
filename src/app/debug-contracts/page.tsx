'use client';
import { useState, useEffect } from 'react';
import { db } from '@/utils/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function DebugContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'formAnswers'));
        const contractsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setContracts(contractsData);
      } catch (error) {
        console.error('Error fetching contracts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const selectContract = (contractId: string) => {
    localStorage.setItem('currentContractId', contractId);
    window.location.href = '/contract-preview';
  };

  if (loading) {
    return <div className="p-8">Loading contracts...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Debug: Select Contract for Testing</h1>
      <div className="space-y-4">
        {contracts.map((contract) => {
          const answers = contract.answers || contract;
          const landlords = answers.landlords || [];
          const landlordName = landlords.length > 0 ? landlords[0].landlordName : answers.landlordName || 'No name';
          const hasData = landlords.length > 0 && landlords[0].landlordName;
          
          return (
            <div 
              key={contract.id} 
              className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                hasData ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}
              onClick={() => selectContract(contract.id)}
            >
              <div className="font-semibold">Contract ID: {contract.id}</div>
              <div>Landlord: {landlordName}</div>
              <div>Status: {contract.paymentStatus || contract.status}</div>
              <div className="text-sm text-gray-600">
                {hasData ? '✅ Has data - Good for testing' : '❌ Empty data - Not suitable for testing'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
