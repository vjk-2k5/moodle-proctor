import crypto from 'crypto';

export type ScanSessionStatus =
  | 'awaiting_upload'
  | 'upload_in_progress'
  | 'uploaded'
  | 'expired';

export interface ScanUploadSessionRecord {
  token: string;
  status: ScanSessionStatus;
  createdAt: number;
  expiresAt: number;
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

interface CreateScanSessionInput {
  uploadWindowMinutes: number;
  source: string;
  mobileEntryUrl: string;
  student: ScanUploadSessionRecord['student'];
  exam: ScanUploadSessionRecord['exam'];
  attempt: ScanUploadSessionRecord['attempt'];
}

const scanSessions = new Map<string, ScanUploadSessionRecord>();

function createToken(): string {
  return crypto.randomBytes(20).toString('base64url');
}

export function createScanSession(
  input: CreateScanSessionInput
): ScanUploadSessionRecord {
  const createdAt = Date.now();
  const expiresAt = createdAt + input.uploadWindowMinutes * 60 * 1000;
  const token = createToken();

  const session: ScanUploadSessionRecord = {
    token,
    status: 'awaiting_upload',
    createdAt,
    expiresAt,
    uploadWindowMinutes: input.uploadWindowMinutes,
    source: input.source,
    mobileEntryUrl: input.mobileEntryUrl,
    acceptedFileTypes: ['application/pdf'],
    student: input.student,
    exam: input.exam,
    attempt: input.attempt,
    upload: {
      status: 'pending',
      format: 'pdf',
      uploadedAt: null,
      fileName: null,
      fileSizeBytes: null,
      receiptId: null,
      storedPath: null
    }
  };

  scanSessions.set(token, session);
  return session;
}

export function getScanSession(
  token: string
): ScanUploadSessionRecord | null {
  const session = scanSessions.get(token);

  if (!session) {
    return null;
  }

  if (Date.now() >= session.expiresAt) {
    session.status = 'expired';
  }

  return session;
}

export function markScanSessionUploaded(
  token: string,
  upload: {
    receiptId: string;
    fileName: string;
    fileSizeBytes: number;
    storedPath: string;
    uploadedAt?: string;
  }
): ScanUploadSessionRecord | null {
  const session = getScanSession(token);

  if (!session) {
    return null;
  }

  const uploadedAt = upload.uploadedAt || new Date().toISOString();

  session.status = 'uploaded';
  session.upload.status = 'uploaded';
  session.upload.uploadedAt = uploadedAt;
  session.upload.fileName = upload.fileName;
  session.upload.fileSizeBytes = upload.fileSizeBytes;
  session.upload.receiptId = upload.receiptId;
  session.upload.storedPath = upload.storedPath;

  return session;
}

export function serializeScanSession(
  session: ScanUploadSessionRecord
): ScanUploadSessionRecord & { expiresInSeconds: number } {
  const now = Date.now();
  const expiresInSeconds = Math.max(
    0,
    Math.ceil((session.expiresAt - now) / 1000)
  );

  return {
    ...session,
    expiresInSeconds
  };
}
