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

async function parseError(response: Response): Promise<string> {
  const fallback = `HTTP ${response.status}`;

  try {
    const payload = await response.json();
    return payload.error || payload.message || fallback;
  } catch {
    return fallback;
  }
}

export async function validateScanSession(
  token: string
): Promise<ScanUploadSession> {
  const res = await fetch(`/api/session/${encodeURIComponent(token)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const payload = await res.json();
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

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
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
