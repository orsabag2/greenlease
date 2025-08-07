export interface SignatureInvitation {
  id: string;
  contractId: string;
  signerEmail: string;
  signerName: string;
  signerType: 'landlord' | 'tenant' | 'guarantor';
  signerId: string;
  signerRole: string; // Hebrew role name like "המשכיר", "השוכר", "ערב ראשון"
  invitationToken: string;
  status: 'not_sent' | 'sent' | 'signed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  sentAt?: Date;
  signedAt?: Date;
  signatureImage?: string; // Base64 encoded signature
  ipAddress?: string;
  userAgent?: string;
  resendCount?: number;
}

export interface ContractSignatures {
  contractId: string;
  invitations: SignatureInvitation[];
  allSigned: boolean;
  finalPdfUrl?: string;
  sentToAllParties: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignatureData {
  signerEmail: string;
  signerName: string;
  signerId: string;
  signerType: 'landlord' | 'tenant' | 'guarantor';
  signerRole: string;
  signatureImage: string;
  signedAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface SignatureStatus {
  role: string;
  name: string;
  status: 'not_sent' | 'sent' | 'signed' | 'expired';
  email: string;
  signerType: 'landlord' | 'tenant' | 'guarantor';
  signerId: string;
  invitationId?: string;
}

export interface SendSignatureInvitationsRequest {
  contractId: string;
  signers: {
    email: string;
    name: string;
    type: 'landlord' | 'tenant' | 'guarantor';
    id: string;
    role: string;
  }[];
}

export interface SaveSignatureRequest {
  token: string;
  signature: string;
  ipAddress: string;
  userAgent: string;
} 