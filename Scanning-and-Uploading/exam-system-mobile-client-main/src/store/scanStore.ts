import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScanUploadSession, UploadReceipt } from '@/lib/scanSession';

export interface ScannedPage {
  id: string;
  dataUrl: string;
  thumbnail: string;
  capturedAt: number;
}

interface ScanStore {
  sessionToken: string | null;
  studentId: string | null;
  session: ScanUploadSession | null;
  uploadId: string | null;
  uploadReceipt: UploadReceipt | null;
  pages: ScannedPage[];
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadProgress: number;
  setSession: (session: ScanUploadSession) => void;
  addPage: (dataUrl: string, thumbnail: string) => void;
  removePage: (id: string) => void;
  reorderPages: (pages: ScannedPage[]) => void;
  setUploadId: (id: string) => void;
  setUploadResult: (uploadId: string, receipt: UploadReceipt | null) => void;
  setUploadStatus: (status: ScanStore['uploadStatus'], progress?: number) => void;
  reset: () => void;
}

const initialState = {
  sessionToken: null,
  studentId: null,
  session: null,
  uploadId: null,
  uploadReceipt: null,
  pages: [],
  uploadStatus: 'idle' as const,
  uploadProgress: 0,
};

export const useScanStore = create<ScanStore>()(
  persist(
    (set) => ({
      ...initialState,

      setSession: (session) =>
        set({
          sessionToken: session.token,
          studentId: session.student.studentId ?? null,
          session,
        }),

      addPage: (dataUrl, thumbnail) =>
        set((s) => ({
          pages: [
            ...s.pages,
            {
              id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              dataUrl,
              thumbnail,
              capturedAt: Date.now(),
            },
          ],
        })),

      removePage: (id) =>
        set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),

      reorderPages: (pages) => set({ pages }),

      setUploadId: (id) => set({ uploadId: id }),

      setUploadResult: (uploadId, receipt) =>
        set({ uploadId, uploadReceipt: receipt }),

      setUploadStatus: (uploadStatus, progress) =>
        set({ uploadStatus, uploadProgress: progress ?? 0 }),

      reset: () => set(initialState),
    }),
    {
      name: 'proctor-scan-session',
      partialize: (s) => ({
        sessionToken: s.sessionToken,
        studentId: s.studentId,
        session: s.session,
        pages: s.pages,
      }),
    }
  )
);
