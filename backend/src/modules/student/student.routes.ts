// ============================================================================
// Student Module - Routes
// API endpoints for student operations
// ============================================================================

import fp from 'fastify-plugin';
import fs from 'fs';
import path from 'path';
import { FastifyInstance } from 'fastify';
import { createStudentService } from './student.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  buildManualStudent,
  getLatestManualAttempt,
  getManualQuestionPaperPath,
  getManualSessionFromRequest,
  isManualProctoringRequest
} from '../manual-proctoring/manual-proctoring.compat';
import { getRoomEnrollmentContext } from '../room/room-enrollment.service';

// ============================================================================
// Routes Plugin
// ============================================================================

export default fp(async (fastify: FastifyInstance) => {
  const studentService = createStudentService(fastify.pg as any);

  // ==========================================================================
  // GET /api/student - Get student profile and attempts
  // ==========================================================================

  fastify.get('/api/student', {
    onRequest: [authMiddleware],
    handler: async (request, reply) => {
      // @ts-ignore
      const userId = request.user.id;

      try {
        if (isManualProctoringRequest(request)) {
          const session = getManualSessionFromRequest(request as any);

          if (!session) {
            return reply.code(401).send({
              success: false,
              message: 'Invalid session'
            });
          }

          const { attempt } = getLatestManualAttempt();

          return reply.send({
            success: true,
            student: buildManualStudent(),
            attempt
          });
        }

        const result = await studentService.getStudentProfile(userId);
        return reply.send(result);
      } catch (error) {
        if ((error as Error).message === 'Student not found') {
          return reply.code(404).send({
            success: false,
            error: 'Student profile not found'
          });
        }
        throw error;
      }
    }
  });

  // ==========================================================================
  // GET /api/session - Validate proctoring session
  // ==========================================================================

  fastify.get('/api/session/:sessionId', {
    onRequest: [authMiddleware],
    schema: {
      params: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' }
        },
        required: ['sessionId']
      },
      querystring: {
        type: 'object',
        properties: {
          attemptId: { type: 'number' }
        },
        required: ['attemptId']
      }
    },
    handler: async (request, reply) => {
      // @ts-ignore
      const userId = request.user.id;
      const { sessionId } = request.params as { sessionId: string };
      const { attemptId } = request.query as { attemptId: number };

      const result = await studentService.validateSession(sessionId, attemptId, userId);
      return reply.send(result);
    }
  });

  // ==========================================================================
  // GET /files/:filename - Serve exam-related static files
  // ==========================================================================

  fastify.get('/files/:filename', {
    handler: async (request, reply) => {
      const { filename } = request.params as { filename: string };
      const safeFilename = path.basename(filename);
      const roomEnrollment = await getRoomEnrollmentContext(
        fastify.pg as any,
        request.headers as Record<string, unknown>
      );

      if (roomEnrollment) {
        const candidatePaths = [
          roomEnrollment.questionPaperPath
            ? path.resolve(process.cwd(), roomEnrollment.questionPaperPath.replace(/^[/\\]+/, ''))
            : null,
          path.resolve(process.cwd(), 'uploads', safeFilename),
          getManualQuestionPaperPath(safeFilename)
        ].filter((value): value is string => Boolean(value));

        const filePath = candidatePaths.find(candidate => fs.existsSync(candidate));

        if (!filePath) {
          return reply.code(404).send({
            success: false,
            error: 'File not found'
          });
        }

        reply.header('Content-Type', 'application/pdf');
        return reply.send(fs.createReadStream(filePath));
      }

      if (isManualProctoringRequest(request)) {
        const session = getManualSessionFromRequest(request as any);

        if (!session) {
          return reply.code(401).send({
            success: false,
            message: 'Invalid session'
          });
        }

        const filePath = getManualQuestionPaperPath(filename);

        if (!fs.existsSync(filePath)) {
          return reply.code(404).send({
            success: false,
            error: 'File not found'
          });
        }

        reply.header('Content-Type', 'application/pdf');
        return reply.send(fs.createReadStream(filePath));
      }

      // Security: Prevent path traversal
      const sanitizedFilename = filename.replace(/..\//g, '').replace(/\\/g, '');

      // Basic file extension check
      const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
      const hasAllowedExtension = allowedExtensions.some(ext =>
        sanitizedFilename.toLowerCase().endsWith(ext)
      );

      if (!hasAllowedExtension) {
        return reply.code(403).send({
          success: false,
          error: 'File type not allowed'
        });
      }

      // In a real implementation, you would serve files from a secure storage
      // For now, we'll just return the filename
      return reply.send({
        success: true,
        data: {
          filename: sanitizedFilename,
          url: `/uploads/${sanitizedFilename}`
        }
      });
    }
  });

  console.log('✅ Student routes registered');
}, {
  name: 'student-routes'
});
