// ============================================================================
// LTI Module - Type Definitions and Validation Schemas
// Defines LTI 1.1 launch request types and Zod validation schemas
// ============================================================================

import { z } from 'zod';

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * LTI 1.1 Launch Request (from Moodle)
 * Based on IMS LTI 1.1 specification:
 * https://www.imsglobal.org/specs/ltiv1p1/implementation-guide
 */
export interface LtiLaunchRequest {
  // OAuth 1.0 parameters
  oauth_consumer_key: string;
  oauth_signature: string;
  oauth_timestamp: string;
  oauth_nonce: string;
  oauth_version?: string;
  oauth_signature_method?: string;

  // LTI context parameters
  context_id: string;
  context_label?: string;
  context_title?: string;
  resource_link_id: string;
  resource_link_title?: string;

  // User parameters
  user_id: string;
  lis_person_contact_email_primary?: string;
  lis_person_name_full?: string;
  lis_person_name_given?: string;
  lis_person_name_family?: string;

  // Role parameters
  roles: string; // Comma-separated: "Learner" or "Instructor,TeachingAssistant"

  // Outcome parameters (for grade passback - deferred to Phase 2)
  lis_outcome_service_url?: string;
  lis_result_sourcedid?: string;

  // Tool consumer information
  tool_consumer_info_product_family_code?: string;
  tool_consumer_info_version?: string;
  tool_consumer_instance_guid?: string;
  tool_consumer_instance_name?: string;

  // Custom parameters (optional)
  custom?: Record<string, any>;
}

/**
 * LTI Launch Response (from backend)
 * Contains JWT token and room information for desktop app
 */
export interface LtiLaunchResponse {
  success: boolean;
  data?: {
    roomCode: string;
    token: string;
    contextLabel?: string;
  };
  error?: string;
}

/**
 * LTI Role Types
 */
export enum LtiRole {
  LEARNER = 'Learner',
  INSTRUCTOR = 'Instructor',
  TEACHING_ASSISTANT = 'TeachingAssistant',
  CONTENT_DEVELOPER = 'ContentDeveloper',
  MEMBER = 'Member',
  MENTOR = 'Mentor',
  ADMIN = 'Administrator',
  NONE = 'None'
}

/**
 * Parsed LTI context
 * Extracted and validated from launch request
 */
export interface LtiContext {
  contextKey: string; // {context_id}_{resource_link_id}
  contextLabel?: string;
  resourceId: string;
  userId: string;
  userEmail?: string;
  userFullname?: string;
  roles: LtiRole[];
  isInstructor: boolean;
  outcomeServiceUrl?: string;
  outcomeResultId?: string;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

/**
 * LTI Launch Request Schema
 * Validates required OAuth and LTI parameters
 */
export const ltiLaunchRequestSchema = z.object({
  // OAuth 1.0 parameters (required)
  oauth_consumer_key: z.string().min(1, 'OAuth consumer key is required'),
  oauth_signature: z.string().min(1, 'OAuth signature is required'),
  oauth_timestamp: z.string().regex(/^\d+$/, 'OAuth timestamp must be numeric'),
  oauth_nonce: z.string().min(1, 'OAuth nonce is required'),
  oauth_version: z.string().optional(),
  oauth_signature_method: z.string().optional(),

  // LTI context parameters (required)
  context_id: z.string().min(1, 'LTI context ID is required'),
  context_label: z.string().optional(),
  context_title: z.string().optional(),
  resource_link_id: z.string().min(1, 'LTI resource link ID is required'),
  resource_link_title: z.string().optional(),

  // User parameters (optional but recommended)
  user_id: z.string().min(1, 'LTI user ID is required'),
  lis_person_contact_email_primary: z.string().email().optional(),
  lis_person_name_full: z.string().optional(),
  lis_person_name_given: z.string().optional(),
  lis_person_name_family: z.string().optional(),

  // Role parameter (required)
  roles: z.string().min(1, 'LTI roles parameter is required'),

  // Outcome parameters (optional - for grade passback)
  lis_outcome_service_url: z.string().url().optional(),
  lis_result_sourcedid: z.string().optional(),

  // Tool consumer information (optional)
  tool_consumer_info_product_family_code: z.string().optional(),
  tool_consumer_info_version: z.string().optional(),
  tool_consumer_instance_guid: z.string().optional(),
  tool_consumer_instance_name: z.string().optional(),

  // Custom parameters (optional)
  custom: z.record(z.any()).optional()
});

/**
 * LTI Token Payload (JWT)
 * Encoded in JWT token sent to desktop app
 */
export const ltiTokenPayloadSchema = z.object({
  userId: z.number(),
  roomCode: z.string(),
  ltiLaunch: z.literal(true),
  contextId: z.string(),
  resourceId: z.string(),
  role: z.enum(['student', 'instructor']),
  iat: z.number(),
  exp: z.number()
});

// ============================================================================
// Error Classes
// ============================================================================

/**
 * LTI Validation Error
 * Thrown when OAuth signature or LTI parameters are invalid
 */
export class LtiValidationError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'LtiValidationError';
  }
}

/**
 * LTI Timestamp Error
 * Thrown when OAuth timestamp is outside valid window
 */
export class LtiTimestampError extends Error {
  constructor(timestamp: string, _currentTimestamp: number) {
    super(`OAuth timestamp is too old or too new: ${timestamp}`);
    this.name = 'LtiTimestampError';
  }
}

/**
 * LTI Consumer Key Not Found
 * Thrown when OAuth consumer key is not in database
 */
export class LtiConsumerKeyNotFoundError extends Error {
  constructor(consumerKey: string) {
    super(`LTI consumer key not found: ${consumerKey}`);
    this.name = 'LtiConsumerKeyNotFoundError';
  }
}

/**
 * LTI Room Creation Error
 * Thrown when room creation fails
 */
export class LtiRoomCreationError extends Error {
  constructor(contextKey: string, public readonly cause?: Error) {
    super(`Failed to create room for LTI context: ${contextKey}`);
    this.name = 'LtiRoomCreationError';
    this.cause = cause;
  }
}
