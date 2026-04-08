import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import {
  authMiddleware,
  requireStudent
} from '../../middleware/auth.middleware';
import config from '../../config';
import {
  buildManualStudent,
  getLatestManualAttempt,
  isManualProctoringRequest
} from '../manual-proctoring/manual-proctoring.compat';
import {
  createScanSession,
  getScanSession,
  markScanSessionUploaded,
  serializeScanSession
} from './scan-session.store';

const DEFAULT_UPLOAD_WINDOW_MINUTES = Math.max(
  1,
  parseInt(process.env.ANSWER_SHEET_UPLOAD_WINDOW_MINUTES || '30', 10)
);
const MOBILE_SCAN_BASE_URL =
  process.env.MOBILE_SCAN_BASE_URL || 'http://localhost:3000';
const ANSWER_SHEET_PDF_DIR = path.resolve(
  process.cwd(),
  config.upload.dir,
  'answer-sheet-pdfs'
);

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

function buildMobileEntryUrl(token: string): string {
  const url = new URL(normalizeBaseUrl(MOBILE_SCAN_BASE_URL));
  url.searchParams.set('id', token);
  return url.toString();
}

function buildStudentName(row: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  const fullName = [row.firstName, row.lastName]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || String(row.username || row.email || 'Student');
}

function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(String(fileName || 'answer-sheet.pdf'));
  const normalized = baseName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return normalized.toLowerCase().endsWith('.pdf')
    ? normalized
    : `${normalized}.pdf`;
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('utf8') === '%PDF-';
}

export default fp(
  async (fastify: FastifyInstance) => {
    fastify.post('/api/scan/sessions', {
      onRequest: [authMiddleware, requireStudent],
      schema: {
        body: {
          type: 'object',
          properties: {
            attemptId: { type: 'number' },
            uploadWindowMinutes: { type: 'number' },
            source: { type: 'string' }
          }
        }
      },
      handler: async (request, reply) => {
        const body = (request.body || {}) as {
          attemptId?: number;
          uploadWindowMinutes?: number;
          source?: string;
        };
        const uploadWindowMinutes = Math.max(
          1,
          Number(body.uploadWindowMinutes) || DEFAULT_UPLOAD_WINDOW_MINUTES
        );
        const source = String(body.source || 'electron_post_exam');
        const roomEnrollment = (request as any).roomEnrollment as
          | {
              examId: number;
              examName: string;
              courseName: string;
              studentName: string;
              studentEmail: string;
            }
          | undefined;

        if (isManualProctoringRequest(request)) {
          const manualAttemptPayload = getLatestManualAttempt();
          const manualStudent = buildManualStudent();

          if (manualAttemptPayload.attempt.status !== 'submitted') {
            return reply.code(409).send({
              success: false,
              error:
                'Answer sheet upload is only available after the exam is submitted'
            });
          }

          const session = createScanSession({
            uploadWindowMinutes,
            source,
            mobileEntryUrl: buildMobileEntryUrl('pending-manual-token'),
            student: {
              userId: 900001,
              studentId: manualStudent.id,
              name: manualStudent.name,
              email: manualStudent.email
            },
            exam: {
              id: 0,
              name: manualAttemptPayload.examName,
              courseName: null
            },
            attempt: {
              id: manualAttemptPayload.attempt.id,
              status: manualAttemptPayload.attempt.status,
              submittedAt: manualAttemptPayload.attempt.submittedAt
                ? new Date(
                    manualAttemptPayload.attempt.submittedAt
                  ).toISOString()
                : null,
              submissionReason: manualAttemptPayload.attempt.submissionReason,
              violationCount: manualAttemptPayload.attempt.violationCount
            }
          });

          session.mobileEntryUrl = buildMobileEntryUrl(session.token);

          return reply.send({
            success: true,
            data: serializeScanSession(session)
          });
        }

        const userId = (request.user as any).id as number;
        const attemptId = Number(body.attemptId || 0);

        if (!attemptId) {
          return reply.code(400).send({
            success: false,
            error: 'Attempt ID is required to create a scan session'
          });
        }

        const result = await fastify.pg.query<{
          attemptId: number;
          attemptStatus: string;
          submittedAt: Date | null;
          submissionReason: string | null;
          violationCount: number;
          examId: number;
          examName: string;
          courseName: string | null;
          studentId: number;
          studentEmail: string;
          username: string;
          firstName: string | null;
          lastName: string | null;
        }>(
          `SELECT
             ea.id as "attemptId",
             ea.status as "attemptStatus",
             ea.submitted_at as "submittedAt",
             ea.submission_reason as "submissionReason",
             ea.violation_count as "violationCount",
             e.id as "examId",
             e.exam_name as "examName",
             e.course_name as "courseName",
             u.id as "studentId",
             u.email as "studentEmail",
             u.username as "username",
             u.first_name as "firstName",
             u.last_name as "lastName"
           FROM exam_attempts ea
           JOIN exams e ON e.id = ea.exam_id
           JOIN users u ON u.id = ea.user_id
           WHERE ea.id = $1
           AND ea.user_id = $2
           LIMIT 1`,
          [attemptId, userId]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({
            success: false,
            error: 'Submitted exam attempt not found'
          });
        }

        const row = result.rows[0];

        if (row.attemptStatus !== 'submitted') {
          return reply.code(409).send({
            success: false,
            error:
              'Answer sheet upload is only available after the exam is submitted'
          });
        }

        const session = createScanSession({
          uploadWindowMinutes,
          source,
          mobileEntryUrl: buildMobileEntryUrl('pending-token'),
          student: {
            userId: row.studentId,
            studentId: String(row.studentId),
            name: roomEnrollment?.studentName || buildStudentName(row),
            email: roomEnrollment?.studentEmail || row.studentEmail
          },
          exam: {
            id: roomEnrollment?.examId || row.examId,
            name: roomEnrollment?.examName || row.examName,
            courseName: roomEnrollment?.courseName || row.courseName
          },
          attempt: {
            id: row.attemptId,
            status: row.attemptStatus,
            submittedAt: row.submittedAt
              ? new Date(row.submittedAt).toISOString()
              : null,
            submissionReason: row.submissionReason,
            violationCount: row.violationCount
          }
        });

        session.mobileEntryUrl = buildMobileEntryUrl(session.token);

        return reply.send({
          success: true,
          data: serializeScanSession(session)
        });
      }
    });

    fastify.get('/api/scan/sessions/:token', {
      schema: {
        params: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          },
          required: ['token']
        }
      },
      handler: async (request, reply) => {
        const { token } = request.params as { token: string };
        const session = getScanSession(token);

        if (!session) {
          return reply.code(404).send({
            success: false,
            error: 'Scan session not found'
          });
        }

        if (session.status === 'expired') {
          return reply.code(410).send({
            success: false,
            error: 'Scan session has expired',
            data: serializeScanSession(session)
          });
        }

        return reply.send({
          success: true,
          data: serializeScanSession(session)
        });
      }
    });

    fastify.post('/api/scan/sessions/:token/pdf', {
      bodyLimit: Math.max(config.upload.maxFileSize * 2, 4 * 1024 * 1024),
      schema: {
        params: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          },
          required: ['token']
        },
        body: {
          type: 'object',
          properties: {
            fileName: { type: 'string' },
            mimeType: { type: 'string' },
            fileBase64: { type: 'string' }
          },
          required: ['fileName', 'mimeType', 'fileBase64']
        }
      },
      handler: async (request, reply) => {
        const { token } = request.params as { token: string };
        const body = request.body as {
          fileName: string;
          mimeType: string;
          fileBase64: string;
        };
        const session = getScanSession(token);

        if (!session) {
          return reply.code(404).send({
            success: false,
            error: 'Scan session not found'
          });
        }

        if (session.status === 'expired') {
          return reply.code(410).send({
            success: false,
            error: 'Scan session has expired',
            data: serializeScanSession(session)
          });
        }

        if (session.upload.status === 'uploaded') {
          return reply.code(409).send({
            success: false,
            error:
              'An answer sheet PDF has already been uploaded for this session',
            data: serializeScanSession(session)
          });
        }

        if (String(body.mimeType || '').toLowerCase() !== 'application/pdf') {
          return reply.code(400).send({
            success: false,
            error: 'Only PDF uploads are supported for this session'
          });
        }

        let fileBuffer: Buffer;
        try {
          fileBuffer = Buffer.from(String(body.fileBase64 || ''), 'base64');
        } catch (_error) {
          return reply.code(400).send({
            success: false,
            error: 'The uploaded PDF could not be decoded'
          });
        }

        if (!fileBuffer.length) {
          return reply.code(400).send({
            success: false,
            error: 'The uploaded PDF is empty'
          });
        }

        if (fileBuffer.length > config.upload.maxFileSize) {
          return reply.code(413).send({
            success: false,
            error: `The uploaded PDF exceeds the ${Math.round(
              config.upload.maxFileSize / (1024 * 1024)
            )} MB limit`
          });
        }

        if (!isPdfBuffer(fileBuffer)) {
          return reply.code(400).send({
            success: false,
            error: 'The uploaded file is not a valid PDF'
          });
        }

        const receiptId = `receipt_${crypto.randomBytes(10).toString('hex')}`;
        const uploadedAt = new Date().toISOString();
        const safeFileName = sanitizeFileName(body.fileName);
        const studentDir = path.join(
          ANSWER_SHEET_PDF_DIR,
          session.student.studentId
        );
        const storedFileName = `${session.attempt.id || 'attempt'}_${token.slice(
          0,
          12
        )}_${safeFileName}`;
        const storedPath = path.join(studentDir, storedFileName);

        await fs.mkdir(studentDir, { recursive: true });
        await fs.writeFile(storedPath, fileBuffer);

        const updatedSession = markScanSessionUploaded(token, {
          receiptId,
          fileName: safeFileName,
          fileSizeBytes: fileBuffer.length,
          storedPath,
          uploadedAt
        });

        return reply.send({
          success: true,
          data: updatedSession ? serializeScanSession(updatedSession) : null,
          receipt: {
            id: receiptId,
            uploadedAt,
            fileName: safeFileName,
            fileSizeBytes: fileBuffer.length
          }
        });
      }
    });
  },
  {
    name: 'scan-routes'
  }
);
