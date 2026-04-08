'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScanStore } from '@/store/scanStore';
import { uploadPdfAnswerSheet } from '@/lib/api';

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatCountdown(expiresAt: number): string {
  const remaining = Math.max(0, expiresAt - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);

  if (totalSeconds <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sessionToken = useScanStore((s) => s.sessionToken);
  const session = useScanStore((s) => s.session);
  const uploadStatus = useScanStore((s) => s.uploadStatus);
  const uploadProgress = useScanStore((s) => s.uploadProgress);
  const setUploadStatus = useScanStore((s) => s.setUploadStatus);
  const setUploadResult = useScanStore((s) => s.setUploadResult);
  const setSession = useScanStore((s) => s.setSession);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState('');

  const isExpired = useMemo(
    () => !session || Date.now() >= session.expiresAt || session.status === 'expired',
    [session]
  );

  useEffect(() => {
    if (!sessionToken || !session) {
      router.replace('/');
    }
  }, [router, session, sessionToken]);

  useEffect(() => {
    if (!session) {
      return;
    }

    setCountdown(formatCountdown(session.expiresAt));

    const timer = window.setInterval(() => {
      const nextCountdown = formatCountdown(session.expiresAt);
      setCountdown(nextCountdown);

      if (Date.now() >= session.expiresAt) {
        setSession({ ...session, status: 'expired' });
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session, setSession]);

  if (!sessionToken || !session) {
    return null;
  }

  const handleChooseFile = () => {
    if (uploadStatus === 'uploading' || isExpired) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setErrorMsg('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      setErrorMsg('Please choose a PDF file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('The PDF is larger than 10 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !sessionToken || uploadStatus === 'uploading' || isExpired) {
      return;
    }

    try {
      setErrorMsg('');
      setUploadStatus('uploading', 20);

      const response = await uploadPdfAnswerSheet(sessionToken, selectedFile);
      setUploadStatus('uploading', 80);

      if (response.session) {
        setSession(response.session);
      }

      setUploadResult(response.uploadId, response.receipt);
      setUploadStatus('success', 100);
      router.push('/success');
    } catch (error) {
      setUploadStatus('error', 0);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Could not upload the answer sheet PDF.'
      );
    }
  };

  const isUploading = uploadStatus === 'uploading';

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="px-5 pt-safe-top py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-mono text-xs tracking-widest text-accent uppercase">
                Upload Session
              </span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-text-primary leading-tight">
              Submit Answer Sheet PDF
            </h1>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-[32rem]">
              Upload the final scanned PDF for this student. This pass validates
              the QR session and stores the PDF against the generated upload token.
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1.5 text-xs font-mono border ${
              isExpired
                ? 'border-danger/30 text-danger bg-danger/10'
                : 'border-accent/20 text-accent bg-accent/5'
            }`}
          >
            {isExpired ? 'Session expired' : countdown}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-5 pb-32">
        <section className="rounded-3xl bg-surface border border-border p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
                Student
              </p>
              <p className="mt-1 text-lg font-display font-bold text-text-primary">
                {session.student.name}
              </p>
              <p className="text-sm text-text-secondary">{session.student.email}</p>
              <p className="text-xs text-text-muted mt-1">
                ID: {session.student.studentId}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
                Exam
              </p>
              <p className="mt-1 text-lg font-display font-bold text-text-primary">
                {session.exam.name}
              </p>
              <p className="text-sm text-text-secondary">
                {session.exam.courseName || 'Course not provided'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Attempt #{session.attempt.id} - Submitted {formatDateTime(session.attempt.submittedAt)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-surface border border-border p-5 shadow-sm">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
              PDF Upload
            </p>
            <h2 className="mt-2 text-xl font-display font-bold text-text-primary">
              Choose the final PDF file
            </h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Accepted type: PDF only. The current backend limit is 10 MB. Once
              uploaded, the session is marked complete for this token.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={handleChooseFile}
              disabled={isUploading || isExpired}
              className="w-full rounded-2xl bg-accent text-bg py-4 px-5 font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selectedFile ? 'Choose a different PDF' : 'Choose PDF'}
            </button>

            <div className="mt-4 rounded-2xl bg-bg border border-border p-4">
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary break-all">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatFileSize(selectedFile.size)} - {selectedFile.type || 'application/pdf'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No PDF selected yet.</p>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMsg}
            </div>
          )}

          {isUploading && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-text-secondary font-mono mb-2">
                <span>Submitting PDF</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-surface border border-border p-5 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
            Session Rules
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-bg border border-border p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">
                Deadline
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {countdown}
              </p>
            </div>
            <div className="rounded-2xl bg-bg border border-border p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {session.status.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="rounded-2xl bg-bg border border-border p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider">
                File Type
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {session.acceptedFileTypes.join(', ')}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-bg/95 backdrop-blur-sm border-t border-border px-5 pb-safe-bottom pb-6 pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedFile || isUploading || isExpired}
          className="w-full rounded-2xl bg-accent text-bg py-4 px-5 font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
        >
          {isUploading ? 'Uploading PDF...' : 'Submit Answer Sheet PDF'}
        </button>
      </div>
    </div>
  );
}
