'use client';
import React, { useEffect, useState } from 'react';
import { auth, db } from '../../utils/firebase';
import type { User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SignatureProgressBar from '../../components/SignatureProgressBar';

interface ContractData {
  id: string;
  userId: string;
  answers: any;
  updatedAt: Date;
  status: 'in_progress' | 'paid' | 'completed' | 'archived';
  paymentStatus?: string;
  paymentId?: string;
  step?: number;
  innerStep?: number;
  contractAddress?: string;
  landlordName?: string;
  tenantName?: string;
  monthlyRent?: string;
  moveInDate?: string;
  rentEndDate?: string;
  editCount?: number;
  maxEdits?: number;
  isLocked?: boolean;
  lastEditDate?: Date;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ready' | 'in_progress' | 'archived'>('in_progress');
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Contract Edit Button Component
  const ContractEditButton = ({ contract }: { contract: ContractData }) => {
    const [hasSignedSignatures, setHasSignedSignatures] = useState(false);
    const [allSigned, setAllSigned] = useState(false);
    const [signers, setSigners] = useState<any[]>([]);
    const [loadingSignatures, setLoadingSignatures] = useState(false);

    useEffect(() => {
      const checkSignatures = async () => {
        setLoadingSignatures(true);
        try {
          const response = await fetch(`/api/signature/status?contractId=${contract.id}`);
          if (response.ok) {
            const data = await response.json();
            setSigners(data.signers || []);
            const hasSigned = data.signers?.some((signer: any) => signer.status === 'signed') || false;
            const allParticipantsSigned = data.signers?.length > 0 && data.signers.every((signer: any) => signer.status === 'signed');
            setHasSignedSignatures(hasSigned);
            setAllSigned(allParticipantsSigned);
          }
        } catch (error) {
          console.error('Error checking signatures:', error);
        } finally {
          setLoadingSignatures(false);
        }
      };

      checkSignatures();
    }, [contract.id]);

    // Debug logging
    console.log('Dashboard Edit Button Debug (ContractEditButton):', {
      contractId: contract.id,
      loadingSignatures,
      hasSignedSignatures,
      allSigned,
      signersLength: signers.length,
      signers: signers.map(s => ({ status: s.status, name: s.name, type: s.signerType })),
      contractStatus: contract.status,
      isLocked: contract.isLocked
    });

    if (loadingSignatures) {
      return (
        <div className="flex items-center w-full px-3 py-2 text-sm text-gray-400">
          בודק חתימות...
        </div>
      );
    }

    // Hide the edit button when all parties have signed the contract
    if (allSigned) {
      console.log('Edit button hidden - all parties have signed the contract');
      return null; // Hide the edit button completely when all signatures are complete
    }

    return (
      <button
        onClick={() => {
          const remainingEdits = (contract.maxEdits || 3) - (contract.editCount || 0);
          
          if (remainingEdits <= 0) {
            alert('לא ניתן לערוך חוזה זה יותר. החוזה נעול.');
            return;
          }
          
          // Show confirmation dialog with signature warning
          let confirmMessage = `יש לך ${remainingEdits} עריכות שנותרו. האם אתה בטוח שברצונך לערוך?`;
          
          // Add warning if there are sent (but not signed) invitations
          const hasSentInvitations = signers?.some((signer: any) => signer.status === 'sent') || false;
          if (hasSentInvitations) {
            confirmMessage = `אזהרה: קיימות הזמנות לחתימה שנשלחו. עריכת החוזה תבטל את ההזמנות הקיימות.\n\n${confirmMessage}`;
          }
          
          if (confirm(confirmMessage)) {
            localStorage.setItem('editingFromDashboard', 'true');
            localStorage.setItem('contractMeta', JSON.stringify(contract.answers));
            localStorage.setItem('currentContractId', contract.id);
            setOpenMenuId(null); // Close menu
            router.push('/');
          }
        }}
        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        ערוך חוזה ({(contract.maxEdits || 3) - (contract.editCount || 0)} שנותרו)
      </button>
    );
  };

  // Check if user should be directed to a specific tab
  useEffect(() => {
    const savedTab = localStorage.getItem('dashboardActiveTab');
    if (savedTab && (savedTab === 'ready' || savedTab === 'in_progress' || savedTab === 'archived')) {
      setActiveTab(savedTab as 'ready' | 'in_progress' | 'archived');
      // Clear the saved tab so it doesn't persist
      localStorage.removeItem('dashboardActiveTab');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setUser(u);
      setLoadingAuth(false);
      if (!u) {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarDropdownOpen && !(event.target as Element).closest('.avatar-dropdown-container')) {
        setAvatarDropdownOpen(false);
      }
      if (openMenuId && !(event.target as Element).closest('.contract-menu-container')) {
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarDropdownOpen, openMenuId]);

  useEffect(() => {
    if (!user) return;

    const fetchContracts = () => {
      try {
        setLoading(true);
        
        // Get user's form answers (contracts in progress) with real-time listener
        const formAnswersQuery = query(
          collection(db, 'formAnswers'),
          where('userId', '==', user.uid)
        );
        
        const unsubscribe = onSnapshot(formAnswersQuery, (snapshot) => {
          const contractsData: ContractData[] = [];
          
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const answers = data.answers || {};
            
            // Extract contract details from answers
            const landlordName = Array.isArray(answers.landlords) && answers.landlords[0] 
              ? answers.landlords[0].landlordName 
              : answers.landlordName;
            
            const tenantName = Array.isArray(answers.tenants) && answers.tenants[0] 
              ? answers.tenants[0].tenantName 
              : answers.tenantName;
            
            const addressParts = [
              answers.street,
              answers.buildingNumber,
              answers.apartmentNumber ? `דירה ${answers.apartmentNumber}` : '',
              answers.propertyCity
            ].filter(Boolean);
            
            const contractAddress = addressParts.join(' ');
            
            // Use the status from Firestore, but fallback to payment status for backward compatibility
            let status: 'in_progress' | 'paid' | 'completed' | 'archived' = data.status || 'in_progress';
            
            // Only override with payment status if the status is not explicitly set and payment status is 'paid'
            // This prevents new contracts from being marked as 'paid' incorrectly
            if (data.paymentStatus === 'paid' && !data.status && status !== 'archived') {
              status = 'paid';
            }
            
            console.log('Contract status determination:', {
              contractId: doc.id,
              firestoreStatus: data.status,
              paymentStatus: data.paymentStatus,
              finalStatus: status,
              hasAnswers: !!data.answers,
              answersKeys: data.answers ? Object.keys(data.answers) : []
            });
            
            contractsData.push({
              id: doc.id,
              userId: data.userId,
              answers: answers,
              updatedAt: data.updatedAt?.toDate() || new Date(),
              status: status,
              paymentStatus: data.paymentStatus,
              paymentId: data.paymentId,
              step: data.step,
              innerStep: data.innerStep,
              contractAddress,
              landlordName,
              tenantName,
              monthlyRent: answers.monthlyRent,
              moveInDate: answers.moveInDate,
              rentEndDate: answers.rentEndDate,
              editCount: data.editCount || 0,
              maxEdits: data.maxEdits || 3,
              isLocked: data.isLocked || false,
              lastEditDate: data.lastEditDate?.toDate()
            });
          });
          
          setContracts(contractsData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
          setLoading(false);
        }, (error) => {
          console.error('Error fetching contracts:', error);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up contracts listener:', error);
        setLoading(false);
      }
    };

    const unsubscribe = fetchContracts();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'בתהליך';
      case 'paid':
        return 'שולם';
      case 'completed':
        return 'הושלם';
      case 'archived':
        return 'בארכיון';
      default:
        return 'לא ידוע';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'archived':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('he-IL');
    } catch {
      return '-';
    }
  };

  const archiveContract = async (contractId: string) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) return;
      
      let newStatus: string;
      if (contract.status === 'archived') {
        // When unarchiving, restore to the original status
        // If it was paid, restore to paid. If it was in_progress, restore to in_progress
        newStatus = contract.paymentStatus === 'paid' ? 'paid' : 'in_progress';
      } else {
        // When archiving, always go to archived
        newStatus = 'archived';
      }
      
      console.log('Archiving contract:', contractId, 'from status:', contract.status, 'to status:', newStatus);
      
      await setDoc(doc(db, 'formAnswers', contractId), {
        status: newStatus,
        updatedAt: new Date(),
      }, { merge: true });
      
      console.log('Successfully updated contract status to:', newStatus);
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error archiving contract:', error);
    }
  };

  const deleteAllArchivedContracts = async () => {
    try {
      const archivedContracts = contracts.filter(c => c.status === 'archived');
      if (archivedContracts.length === 0) return;
      
      // Delete all archived contracts
      const deletePromises = archivedContracts.map(contract => 
        deleteDoc(doc(db, 'formAnswers', contract.id))
      );
      
      await Promise.all(deletePromises);
      console.log(`Deleted ${archivedContracts.length} archived contracts`);
      setShowDeleteAllConfirmation(false);
    } catch (error) {
      console.error('Error deleting all archived contracts:', error);
    }
  };

  if (loadingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38E18E] mx-auto"></div>
          <p className="mt-4 text-gray-600" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
            {isLoading ? 'מעביר לעמוד העריכה...' : 'טוען...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to home page
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }} dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex-shrink-0">
                <img 
                  src="/logo.svg" 
                  alt="GreenLease Logo" 
                  className="h-8 w-auto sm:h-10 md:h-8"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={() => {
                  // Clear localStorage to start fresh
                  localStorage.removeItem('contractMeta');
                  localStorage.removeItem('contractStep');
                  localStorage.removeItem('contractInnerStep');
                  localStorage.removeItem('currentContractId');
                  
                  // Reset sessionStorage to allow modal to show again
                  sessionStorage.removeItem('hasCheckedUnfinishedContract');
                  
                  router.push('/');
                }}
                className="bg-[#38E18E] text-[#281D57] font-bold px-6 py-2 rounded-lg shadow hover:bg-[#2bc77a] transition-colors"
              >
                צור חוזה חדש
              </button>
              <div className="relative avatar-dropdown-container">
                <div
                  onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                  className="cursor-pointer flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden sm:border-2 sm:border-gray-200 hover:border-gray-300 transition-colors bg-white shadow-sm"
                  style={{ borderRadius: '50%' }}
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || user.email || 'User'} 
                      className="w-full h-full object-cover"
                      style={{ borderRadius: '50%' }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full bg-[#38E18E] flex items-center justify-center text-white text-xs sm:text-sm font-bold"
                      style={{ borderRadius: '50%' }}
                    >
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                
                {/* Dropdown Menu */}
                {avatarDropdownOpen && (
                  <div className="fixed top-12 right-4 sm:absolute sm:top-full sm:right-0 sm:mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setAvatarDropdownOpen(false)}
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      החוזים שלי
                    </Link>
                    <button
                      onClick={() => {
                        auth.signOut();
                        setAvatarDropdownOpen(false);
                        // Clear session flag when signing out so modal can show again if user signs back in
                        sessionStorage.removeItem('hasCheckedUnfinishedContract');
                        localStorage.removeItem('hasCheckedUnfinishedContract');
                        sessionStorage.removeItem('modalLastShownTime');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      התנתק
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#38E18E] flex items-center justify-center"></div>
            <p className="mt-4 text-gray-600 text-center">טוען חוזים...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <div className="flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">אין לך חוזים עדיין</h3>
            <p className="mt-2 text-gray-600 text-center">התחל ליצור חוזה שכירות חדש</p>
            <div className="mt-6">
              <button
                onClick={() => {
                  console.log('Dashboard: User chose to create new contract (empty state)');
                  
                  // Clear localStorage to start fresh
                  localStorage.removeItem('contractMeta');
                  localStorage.removeItem('contractStep');
                  localStorage.removeItem('contractInnerStep');
                  localStorage.removeItem('currentContractId');
                  localStorage.removeItem('editingFromDashboard');
                  
                  // Reset sessionStorage to allow modal to show again
                  sessionStorage.removeItem('hasCheckedUnfinishedContract');
                  
                  router.push('/');
                }}
                className="bg-[#38E18E] text-[#281D57] font-bold px-6 py-3 rounded-lg shadow hover:bg-[#2bc77a] transition-colors"
              >
                צור חוזה חדש
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Page Title */}
            <div className="text-right mb-8">
              <p className="text-gray-600 text-lg mb-2">ברוך הבא, {user.displayName || user.email}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">החוזים שלי</h1>
              <p className="text-gray-500 text-sm leading-relaxed max-w-2xl text-right">
                כאן תוכל לנהל את כל החוזים שלך - לראות חוזים בתהליך יצירה, חוזים מוכנים לחתימה, 
                ולגשת לארכיון החוזים הישנים. 
              </p>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('in_progress')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === 'in_progress'
                      ? 'border-[#38E18E] text-[#38E18E]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  בתהליך ({contracts.filter(c => c.status === 'in_progress').length})
                </button>
                <button
                  onClick={() => setActiveTab('ready')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === 'ready'
                      ? 'border-[#38E18E] text-[#38E18E]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  חוזים מוכנים ({contracts.filter(c => c.status === 'paid' || c.status === 'completed').length})
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === 'archived'
                      ? 'border-[#38E18E] text-[#38E18E]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ארכיון ({contracts.filter(c => c.status === 'archived').length})
                </button>
              </nav>
            </div>
            
            {/* Delete All button for archive tab */}
            {activeTab === 'archived' && contracts.filter(c => c.status === 'archived').length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowDeleteAllConfirmation(true)}
                  className="bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-md hover:bg-gray-300 transition-colors text-xs flex items-center gap-1.5 border border-gray-300"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  מחק הכל
                </button>
              </div>
            )}
            
            {(() => {
              const filteredContracts = contracts.filter(contract => {
                switch (activeTab) {
                  case 'ready':
                    return contract.status === 'paid' || contract.status === 'completed';
                  case 'in_progress':
                    return contract.status === 'in_progress';
                  case 'archived':
                    return contract.status === 'archived';
                  default:
                    return true;
                }
              });

              if (filteredContracts.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                    <div className="flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-gray-400">
                      {activeTab === 'archived' ? (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      ) : (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">
                      {activeTab === 'archived' ? 'אין חוזים בארכיון' : 
                       activeTab === 'in_progress' ? 'אין חוזים בתהליך' : 
                       'אין חוזים מוכנים'}
                    </h3>
                    <p className="mt-2 text-gray-600 text-center">
                      {activeTab === 'archived' ? 'החוזים שתעביר לארכיון יופיעו כאן' : 
                       activeTab === 'in_progress' ? 'התחל ליצור חוזה שכירות חדש' : 
                       'החוזים שתשלים ותשלם יופיעו כאן'}
                    </p>
                    {(activeTab === 'ready' || activeTab === 'in_progress') && (
                      <div className="mt-6">
                        <button
                          onClick={() => {
                            console.log('Dashboard: User chose to create new contract');
                            
                            // Clear all localStorage items
                            localStorage.removeItem('contractMeta');
                            localStorage.removeItem('contractStep');
                            localStorage.removeItem('contractInnerStep');
                            localStorage.removeItem('currentContractId');
                            localStorage.removeItem('editingFromDashboard');
                            
                            // Reset sessionStorage to allow modal to show again
                            sessionStorage.removeItem('hasCheckedUnfinishedContract');
                            
                            router.push('/');
                          }}
                          className="bg-[#38E18E] text-[#281D57] font-bold px-6 py-3 rounded-lg shadow hover:bg-[#2bc77a] transition-colors"
                        >
                          צור חוזה חדש
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredContracts.map((contract) => (
                    <div key={contract.id} className={`rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
                      contract.status === 'archived' ? 'bg-gray-50 opacity-75' : 'bg-white'
                    }`}>
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {contract.contractAddress || 'כתובת לא זמינה'}
                              </h3>
                              <div className="space-y-1 text-sm text-gray-600">
                                {contract.landlordName && (
                                  <p><span className="font-medium">משכיר:</span> {contract.landlordName}</p>
                                )}
                                {contract.tenantName && (
                                  <p><span className="font-medium">שוכר:</span> {contract.tenantName}</p>
                                )}
                                {contract.monthlyRent && (
                                  <p><span className="font-medium">דמי שכירות:</span> {contract.monthlyRent} ₪</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                                {getStatusText(contract.status)}
                              </span>
                              <div className="relative contract-menu-container">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === contract.id ? null : contract.id)}
                                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                                {openMenuId === contract.id && (
                                  <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30">
                                    {/* Edit option for paid contracts - only show if contract is not locked and has no signed signatures */}
                                    {contract.status === 'paid' && !contract.isLocked && (
                                      <ContractEditButton contract={contract} />
                                    )}
                                    {contract.status !== 'archived' && (
                                      <button
                                        onClick={() => archiveContract(contract.id)}
                                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                      >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                        </svg>
                                        העבר לארכיון
                                      </button>
                                    )}
                                    {contract.status === 'archived' && (
                                      <button
                                        onClick={() => archiveContract(contract.id)}
                                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                      >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v6H8V5z" />
                                        </svg>
                                        החזר מהארכיון
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-3">
                              <span>תאריך יצירה:</span>
                              <span>{contract.updatedAt.toLocaleDateString('he-IL')}</span>
                            </div>
                            {contract.moveInDate && (
                              <div className="flex justify-between text-sm text-gray-600 mb-3">
                                <span>תאריך כניסה:</span>
                                <span>{formatDate(contract.moveInDate)}</span>
                              </div>
                            )}
                            {contract.rentEndDate && (
                              <div className="flex justify-between text-sm text-gray-600 mb-4">
                                <span>תאריך סיום:</span>
                                <span>{formatDate(contract.rentEndDate)}</span>
                              </div>
                            )}
                            
                            {/* Edit Count Display for Paid Contracts - always show for paid contracts */}
                            {contract.status === 'paid' && (
                              <div className="flex justify-between text-sm text-gray-600 mb-3">
                                <span>עריכות שנותרו:</span>
                                <span>{(contract.maxEdits || 3) - (contract.editCount || 0)}</span>
                              </div>
                            )}
                            {contract.status === 'paid' && contract.isLocked && (
                              <div className="flex justify-between text-sm text-gray-600 mb-3">
                                <span>סטטוס:</span>
                                <span className="text-red-600">🔒 נעול</span>
                              </div>
                            )}
                            {contract.status === 'paid' && contract.editCount && contract.editCount > 0 && contract.lastEditDate && (
                              <div className="flex justify-between text-sm text-gray-600 mb-3">
                                <span>עריכה אחרונה:</span>
                                <span>{contract.lastEditDate.toLocaleDateString('he-IL')}</span>
                              </div>
                            )}
                            
                            {/* Signature Progress Bar for Ready Contracts */}
                            {(contract.status === 'paid' || contract.status === 'completed') && (
                              <div className="mb-4">
                                <SignatureProgressBar contractId={contract.id} compact={true} />
                              </div>
                            )}
                            
                            <div className="flex space-x-3 space-x-reverse">
                              {contract.status === 'in_progress' && (
                                <button
                                  onClick={() => {
                                    // Set loading state
                                    setIsLoading(true);
                                    
                                    // Set flag to indicate user is editing from dashboard
                                    localStorage.setItem('editingFromDashboard', 'true');
                                    
                                    // Save contract data to localStorage and navigate to form
                                    localStorage.setItem('contractMeta', JSON.stringify(contract.answers));
                                    localStorage.setItem('currentContractId', contract.id);
                                    
                                    // Restore step and innerStep if available, with fallback to last step
                                    if (contract.step !== undefined && contract.step !== null) {
                                      localStorage.setItem('contractStep', contract.step.toString());
                                    } else {
                                      // If no step saved, find the last step with data
                                      const answers = contract.answers || {};
                                      let lastStep = 0;
                                      let hasAnyData = false;
                                      
                                      // Check which groups have data
                                      if (answers.landlords && answers.landlords.length > 0 && answers.landlords[0].landlordName) {
                                        lastStep = Math.max(lastStep, 1);
                                        hasAnyData = true;
                                      }
                                      if (answers.tenants && answers.tenants.length > 0 && answers.tenants[0].tenantName) {
                                        lastStep = Math.max(lastStep, 2);
                                        hasAnyData = true;
                                      }
                                      if (answers.propertyCity || answers.street) {
                                        lastStep = Math.max(lastStep, 3);
                                        hasAnyData = true;
                                      }
                                      if (answers.monthlyRent || answers.moveInDate) {
                                        lastStep = Math.max(lastStep, 4);
                                        hasAnyData = true;
                                      }
                                      if (answers.allowPets !== undefined || answers.allowSublet !== undefined) {
                                        lastStep = Math.max(lastStep, 5);
                                        hasAnyData = true;
                                      }
                                      if (answers.security_types || answers.guaranteeAmount) {
                                        lastStep = Math.max(lastStep, 6);
                                        hasAnyData = true;
                                      }
                                      
                                      // Ensure lastStep is never 0 - if no data found, default to 1
                                      if (lastStep === 0) {
                                        lastStep = 1;
                                      }
                                      
                                      localStorage.setItem('contractStep', lastStep.toString());
                                    }
                                    
                                    if (contract.innerStep !== undefined && contract.innerStep !== null) {
                                      localStorage.setItem('contractInnerStep', contract.innerStep.toString());
                                    } else {
                                      localStorage.setItem('contractInnerStep', '1');
                                    }
                                    
                                                                                                              // Small delay to ensure localStorage is set before navigation
                                    setTimeout(() => {
                                      // Navigate to main page - it will automatically restore to the correct step
                                      router.push('/');
                                    }, 100);
                                  }}
                                  className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  המשך עריכה
                                </button>
                              )}
                              {contract.status === 'paid' && (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => {
                                      // Save contract data to localStorage and navigate to preview
                                      localStorage.setItem('contractMeta', JSON.stringify(contract.answers));
                                      localStorage.setItem('currentContractId', contract.id);
                                      router.push('/contract-preview');
                                    }}
                                    className="w-full bg-[#38E18E] text-[#281D57] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#2bc77a] transition-colors cursor-pointer"
                                  >
                                    צפה בחוזה
                                  </button>

                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                מחק את כל החוזים בארכיון?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                פעולה זו תמחק לצמיתות את כל החוזים בארכיון. לא ניתן לבטל פעולה זו.
              </p>
              <div className="flex space-x-3 space-x-reverse">
                <button
                  onClick={() => setShowDeleteAllConfirmation(false)}
                  className="flex-1 bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={deleteAllArchivedContracts}
                  className="flex-1 bg-red-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  מחק הכל
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 