export interface ScanUploadSession {
  token: string;
  status: 'awaiting_upload' | 'upload_in_progress' | 'uploaded' | 'expired';
  createdAt: number;
  expiresAt: number;
  expiresInSeconds: number;
  uploadWindowMinutes: number;
  source: string;
  mobileEntryUrl: string;
  acceptedFileTypes: string[];
  student: {
    userId: number;
    studentId: string;
    name: string;
    email: string;
  };
  exam: {
    id: number;
    name: string;
    courseName: string | null;
  };
  attempt: {
    id: number;
    status: string;
    submittedAt: string | null;
    submissionReason: string | null;
    violationCount: number;
  };
  upload: {
    status: 'pending' | 'uploaded';
    format: 'pdf';
    uploadedAt: string | null;
    fileName: string | null;
    fileSizeBytes: number | null;
    receiptId: string | null;
    storedPath: string | null;
  };
}

export interface UploadReceipt {
  id: string;
  uploadedAt: string;
  fileName: string;
  fileSizeBytes: number;
}
