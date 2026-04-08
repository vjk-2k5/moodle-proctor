import type { ScanUploadSession, UploadReceipt } from '@/lib/scanSession';

export interface UploadUrlsResponse {
  uploadId: string;
  urls: string[];
}

export interface PdfUploadResponse {
  uploadId: string;
  receipt: UploadReceipt | null;
  session: ScanUploadSession | null;
}

export class ScanSessionRequestError extends Error {
  status: number;
  session: ScanUploadSession | null;

  constructor(message: string, status: number, session?: ScanUploadSession | null) {
    super(message);
    this.name = 'ScanSessionRequestError';
    this.status = status;
    this.session = session ?? null;
  }
}

async function parsePayload(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function buildRequestError(response: Response, payload: any): ScanSessionRequestError {
  const fallback = `HTTP ${response.status}`;
  return new ScanSessionRequestError(
    payload.error || payload.message || fallback,
    response.status,
    payload.data || payload.session || null
  );
}

async function parseError(response: Response): Promise<string> {
  const payload = await parsePayload(response);
  const fallback = `HTTP ${response.status}`;

  return payload.error || payload.message || fallback;
}

export async function validateScanSession(
  token: string
): Promise<ScanUploadSession> {
  const res = await fetch(`/api/session/${encodeURIComponent(token)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  const payload = await parsePayload(res);

  if (!res.ok) {
    throw buildRequestError(res, payload);
  }

  return payload.data as ScanUploadSession;
}

export async function uploadPdfAnswerSheet(
  sessionToken: string,
  file: File
): Promise<PdfUploadResponse> {
  const formData = new FormData();
  formData.set('token', sessionToken);
  formData.set('file', file);

  const res = await fetch('/api/pdf-upload', {
    method: 'POST',
    body: formData,
  });

  const payload = await parsePayload(res);

  if (!res.ok) {
    throw buildRequestError(res, payload);
  }

  return payload as PdfUploadResponse;
}

export async function requestUploadUrls(
  sessionToken: string,
  pageCount: number
): Promise<UploadUrlsResponse> {
  const res = await fetch('/api/upload-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: sessionToken, pageCount }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function confirmUpload(
  sessionToken: string,
  uploadId: string
): Promise<void> {
  const res = await fetch('/api/confirm-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: sessionToken, uploadId }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}
