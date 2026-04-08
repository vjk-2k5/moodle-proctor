// ============================================================================
// Moodle Quiz Module - Routes
// HTTP endpoints for syncing and fetching Moodle quiz data
// ============================================================================

import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import {
  fetchQuizzesFromMoodle,
  fetchQuizQuestionsFromMoodle,
  syncQuizToDatabase,
  getQuizByLtiContextKey,
  getQuizByRoomCode
} from './moodle-quiz.service';
import logger from '../../config/logger';

// ============================================================================
// Routes Plugin
// ============================================================================

export default fp(async (fastify: FastifyInstance) => {
  // ==========================================================================
  // POST /api/moodle-quiz/sync - Sync quiz from Moodle to database
  // ==========================================================================
  // Syncs quiz data from Moodle to local database
  // Requires Moodle web service token (from user session)
  // ==========================================================================

  fastify.post('/api/moodle-quiz/sync', async (request, reply) => {
    try {
      // @ts-ignore - JWT payload attached by auth middleware
      const user = request.user;

      if (!user || !user.moodleToken) {
        return reply.code(401).send({
          success: false,
          error: 'Moodle token not found. Please login first.'
        });
      }

      const body = request.body as {
        courseId: number;
        quizId?: number;
        ltiContextKey?: string;
      };

      // Validate request body
      if (!body.courseId) {
        return reply.code(400).send({
          success: false,
          error: 'courseId is required'
        });
      }

      logger.info('Syncing quiz from Moodle', {
        userId: user.userId,
        courseId: body.courseId,
        quizId: body.quizId
      });

      // Fetch quiz from Moodle
      const quizzes = await fetchQuizzesFromMoodle(
        user.moodleToken,
        body.courseId,
        body.quizId
      );

      if (quizzes.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'No quizzes found in Moodle'
        });
      }

      // Sync to database
      const syncResult = await syncQuizToDatabase(
        fastify.pg as any,
        quizzes[0],
        body.ltiContextKey
      );

      return reply.send({
        success: true,
        data: syncResult
      });

    } catch (error: any) {
      logger.error('Quiz sync failed', { error: error.message });
      return reply.code(500).send({
        success: false,
        error: 'Failed to sync quiz from Moodle',
        details: error.message
      });
    }
  });

  // ==========================================================================
  // GET /api/moodle-quiz/lti/:contextKey - Get quiz by LTI context key
  // ==========================================================================
  // Fetches quiz data from local database using LTI context key
  // Used after LTI launch to get quiz questions for desktop app
  // ==========================================================================

  fastify.get('/api/moodle-quiz/lti/:contextKey', async (request, reply) => {
    try {
      const { contextKey } = request.params as { contextKey: string };

      const quiz = await getQuizByLtiContextKey(
        fastify.pg as any,
        contextKey
      );

      if (!quiz) {
        return reply.code(404).send({
          success: false,
          error: 'Quiz not found for this LTI context'
        });
      }

      return reply.send({
        success: true,
        data: quiz
      });

    } catch (error: any) {
      logger.error('Failed to get quiz by LTI context key', {
        error: error.message
      });
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch quiz'
      });
    }
  });

  // ==========================================================================
  // GET /api/moodle-quiz/room/:roomCode - Get quiz by room code
  // ==========================================================================
  // Fetches quiz data from local database using room code
  // Used by desktop app to get quiz questions for exam
  // ==========================================================================

  fastify.get('/api/moodle-quiz/room/:roomCode', async (request, reply) => {
    try {
      const { roomCode } = request.params as { roomCode: string };

      const quiz = await getQuizByRoomCode(
        fastify.pg as any,
        roomCode
      );

      if (!quiz) {
        return reply.code(404).send({
          success: false,
          error: 'Quiz not found for this room'
        });
      }

      return reply.send({
        success: true,
        data: quiz
      });

    } catch (error: any) {
      logger.error('Failed to get quiz by room code', {
        error: error.message
      });
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch quiz'
      });
    }
  });
});
