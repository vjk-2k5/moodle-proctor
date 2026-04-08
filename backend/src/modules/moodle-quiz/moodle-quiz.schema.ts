// ============================================================================
// Moodle Quiz Module - Type Definitions and Validation Schemas
// ============================================================================

import { z } from 'zod';

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * Moodle Quiz (from Moodle REST API)
 */
export interface MoodleQuiz {
  id: number; // Moodle quiz ID
  course: number;
  courseModule: number;
  name: string;
  intro?: string;
  timeOpen?: number | null;
  timeClose?: number | null;
  timeLimit: number;
  questions: MoodleQuestion[];
}

/**
 * Moodle Question
 */
export interface MoodleQuestion {
  id: number; // Moodle question ID
  name: string;
  questionText: string;
  defaultMark: number;
  qtype: string; // multichoice, truefalse, shortanswer, essay, etc.
  category?: number | null;
  options?: any; // Question-specific options (depends on qtype)
}

/**
 * Quiz Sync Result
 * Returned after syncing quiz to database
 */
export interface QuizSyncResult {
  quizId: number; // Internal database ID
  questionIds: number[];
  success: boolean;
  message: string;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

/**
 * Moodle Quiz Schema
 */
export const moodleQuizSchema = z.object({
  id: z.number(),
  course: z.number(),
  courseModule: z.number(),
  name: z.string(),
  intro: z.string().optional(),
  timeOpen: z.number().nullable().optional(),
  timeClose: z.number().nullable().optional(),
  timeLimit: z.number(),
  questions: z.array(z.lazy(() => moodleQuestionSchema))
});

/**
 * Moodle Question Schema
 */
export const moodleQuestionSchema = z.object({
  id: z.number(),
  name: z.string(),
  questionText: z.string(),
  defaultMark: z.number(),
  qtype: z.string(),
  category: z.number().nullable().optional(),
  options: z.any().optional()
});
