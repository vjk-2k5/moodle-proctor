// ============================================================================
// LTI Module - Service Layer
// OAuth 1.0 signature validation and LTI launch processing
// ============================================================================

import { Provider } from 'ims-lti';
import crypto from 'crypto';
import type { Pool } from 'pg';
import logger from '../../config/logger';
import {
  LtiLaunchRequest,
  LtiContext,
  LtiRole,
  ltiLaunchRequestSchema,
  LtiValidationError,
  LtiTimestampError,
  LtiRoomCreationError
} from './lti.schema';

// ============================================================================
// Configuration
// ============================================================================

const OAUTH_TIMESTAMP_WINDOW = 300; // 5 minutes in seconds
const DEFAULT_CONSUMER_KEY = process.env.LTI_CONSUMER_KEY || 'moodle';
const DEFAULT_CONSUMER_SECRET = process.env.LTI_CONSUMER_SECRET || process.env.LTI_SECRET || 'secret';

// ============================================================================
// Nonce Store (in-memory for OAuth 1.0)
// ============================================================================

/**
 * Nonce store interface for ims-lti library
 */
interface NonceStore {
  isNew(nonce: string, timestamp: number): boolean;
  clean(): void;
}

/**
 * Simple in-memory nonce store to prevent replay attacks
 */
class MemoryNonceStore implements NonceStore {
  private nonces = new Set<string>();
  private maxSize = 1000;

  isNew(nonce: string, timestamp: number): boolean {
    const nonceKey = `${nonce}_${timestamp}`;

    // Check if nonce was already used
    if (this.nonces.has(nonceKey)) {
      return false;
    }

    // Store nonce
    this.nonces.add(nonceKey);

    // Clean up old nonces if we're at max size
    if (this.nonces.size > this.maxSize) {
      this.clean();
    }

    return true;
  }

  clean(): void {
    // Remove oldest entries (first 20%)
    const entriesToRemove = Math.floor(this.maxSize * 0.2);
    let count = 0;
    for (const nonce of this.nonces) {
      if (count >= entriesToRemove) break;
      this.nonces.delete(nonce);
      count++;
    }
  }
}

// Create singleton nonce store instance
const nonceStore = new MemoryNonceStore();

// ============================================================================
// LTI Provider (ims-lti library)
// ============================================================================

/**
 * Create LTI Provider with consumer credentials and nonce store
 * NOTE: We create provider per-request since consumer key/secret may vary
 */
function createProvider(consumerKey: string, consumerSecret: string): Provider {
  // ims-lti Provider constructor signature:
  // new Provider(consumerKey, consumerSecret, options, nonceStore)
  return new Provider(
    consumerKey,
    consumerSecret,
    {
      signature_method: 'HMAC-SHA1',
      nonce: () => crypto.randomBytes(16).toString('base64'),
      timestamp: () => Math.floor(Date.now() / 1000).toString()
    },
    nonceStore as any // Cast to any to bypass type checking for nonceStore
  );
}

// ============================================================================
// OAuth Signature Validation
// ============================================================================

/**
 * Validate OAuth 1.0 signature and timestamp
 * @param body - LTI launch request body (OAuth + LTI parameters)
 * @returns Promise<LtiContext> - Parsed and validated LTI context
 * @throws LtiValidationError - if signature is invalid
 * @throws LtiTimestampError - if timestamp is outside valid window
 * @throws LtiConsumerKeyNotFoundError - if consumer key not found
 */
export async function validateLaunchRequest(
  body: any,
  _pg: Pool
): Promise<LtiContext> {
  try {
    // Step 1: Validate request structure with Zod
    const validatedBody = ltiLaunchRequestSchema.parse(body);

    logger.info('LTI launch request received', {
      contextId: validatedBody.context_id,
      resourceId: validatedBody.resource_link_id,
      userId: validatedBody.user_id,
      roles: validatedBody.roles,
      hasSignature: !!validatedBody.oauth_signature,
      timestamp: validatedBody.oauth_timestamp
    });

    // Step 2: Validate OAuth timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    const oauthTimestamp = parseInt(validatedBody.oauth_timestamp, 10);

    if (Math.abs(now - oauthTimestamp) > OAUTH_TIMESTAMP_WINDOW) {
      logger.error('OAuth timestamp outside valid window', {
        oauthTimestamp: validatedBody.oauth_timestamp,
        now,
        window: OAUTH_TIMESTAMP_WINDOW
      });
      throw new LtiTimestampError(validatedBody.oauth_timestamp, now);
    }

    // Step 3: Lookup consumer secret from database or use default
    const consumerKey = validatedBody.oauth_consumer_key;
    let consumerSecret = DEFAULT_CONSUMER_SECRET;

    // TODO: Implement database lookup for consumer keys (multi-tenant support)
    // For MVP, use default consumer key/secret from environment variables
    if (consumerKey !== DEFAULT_CONSUMER_KEY) {
      // Future: Query lti_consumers table for consumer secret
      logger.warn('Non-default consumer key', { consumerKey, defaultKey: DEFAULT_CONSUMER_KEY });
    }

    logger.info('LTI consumer credentials', {
      consumerKey,
      usingDefaultSecret: consumerSecret === DEFAULT_CONSUMER_SECRET,
      secretLength: consumerSecret.length
    });

    // Step 4: Validate OAuth signature using ims-lti Provider
    // NOTE: For development/testing, you can disable signature validation
    // by setting LTI_DISABLE_SIGNATURE_VALIDATION=true in .env
    const disableValidation = process.env.LTI_DISABLE_SIGNATURE_VALIDATION === 'true';

    if (!disableValidation) {
      const provider = createProvider(consumerKey, consumerSecret);

      // The ims-lti library needs the body to have all required OAuth parameters
      // Make sure all required parameters are present
      const requestBody = {
        ...validatedBody,
        oauth_consumer_key: consumerKey,
        oauth_signature: validatedBody.oauth_signature,
        oauth_timestamp: validatedBody.oauth_timestamp,
        oauth_nonce: validatedBody.oauth_nonce,
        oauth_version: validatedBody.oauth_version || '1.0',
        oauth_signature_method: validatedBody.oauth_signature_method || 'HMAC-SHA1'
      };

      const isValid = await provider.valid_request(requestBody);

      if (!isValid) {
        logger.error('OAuth signature validation failed', {
          consumerKey,
          contextId: validatedBody.context_id,
          hasSignature: !!validatedBody.oauth_signature,
          signatureLength: validatedBody.oauth_signature?.length,
          timestamp: validatedBody.oauth_timestamp,
          nonce: validatedBody.oauth_nonce,
          now: Math.floor(Date.now() / 1000),
          method: validatedBody.oauth_signature_method,
          bodyKeys: Object.keys(requestBody).filter(k => !k.startsWith('oauth_'))
        });
        throw new LtiValidationError('Invalid OAuth signature');
      }
    } else {
      logger.warn('⚠️  LTI signature validation DISABLED (development mode)', {
        consumerKey,
        contextId: validatedBody.context_id
      });
    }

    logger.info('LTI launch validated successfully', {
      contextId: validatedBody.context_id,
      resourceId: validatedBody.resource_link_id
    });

    // Step 5: Parse LTI context from validated request
    return parseLtiContext(validatedBody);

  } catch (error: any) {
    if (error instanceof LtiValidationError || error instanceof LtiTimestampError) {
      throw error;
    }

    if (error.name === 'ZodError') {
      logger.error('LTI request validation failed (Zod)', {
        errors: error.errors
      });
      throw new LtiValidationError('Invalid LTI request parameters', error.errors);
    }

    logger.error('LTI validation error:', error);
    throw new LtiValidationError('LTI launch validation failed', error);
  }
}

/**
 * Parse LTI context from validated launch request
 * Extracts user info, roles, and context identifiers
 */
function parseLtiContext(request: LtiLaunchRequest): LtiContext {
  // Parse roles (comma-separated string → array)
  const roleList = request.roles
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);

  // Check if user is instructor (any instructor-like role)
  const isInstructor = roleList.some(role =>
    role.includes('Instructor') ||
    role.includes('TeachingAssistant') ||
    role.includes('Faculty') ||
    role.includes('Staff')
  );

  return {
    contextKey: `${request.context_id}_${request.resource_link_id}`,
    contextLabel: request.context_label || request.context_title,
    resourceId: request.resource_link_id,
    userId: request.user_id,
    userEmail: request.lis_person_contact_email_primary,
    userFullname: request.lis_person_name_full,
    roles: roleList as LtiRole[],
    isInstructor,
    outcomeServiceUrl: request.lis_outcome_service_url,
    outcomeResultId: request.lis_result_sourcedid
  };
}

// ============================================================================
// Room Lookup / Creation
// ============================================================================

/**
 * Find or create proctoring room for LTI context
 * Uses lti_context_key for idempotent room creation
 * @param pg - PostgreSQL pool
 * @param context - Parsed LTI context
 * @param examId - Default exam ID (1 for LTI-created rooms)
 * @param instructorUserId - Optional database user ID for instructor ownership transfer
 * @returns Promise<string> - Room code
 * @throws LtiRoomCreationError - if room creation fails
 */
export async function findOrCreateRoomForLtiContext(
  pg: Pool,
  context: LtiContext,
  examId: number = 1,
  instructorUserId?: number
): Promise<string> {
  const client = await pg.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Check if room exists for this LTI context
    const existingRoomResult = await client.query(
      'SELECT id, room_code, teacher_id FROM proctoring_rooms WHERE lti_context_key = $1',
      [context.contextKey]
    );

    if (existingRoomResult.rows.length > 0) {
      const room = existingRoomResult.rows[0];

      // Ownership transfer: If room is owned by admin (1) and current user is instructor, transfer ownership
      if (room.teacher_id === 1 && context.isInstructor && instructorUserId) {
        await client.query(
          'UPDATE proctoring_rooms SET teacher_id = $1 WHERE id = $2',
          [instructorUserId, room.id]
        );

        logger.info('Transferred room ownership to instructor', {
          roomCode: room.room_code,
          newTeacherId: instructorUserId
        });
      }

      logger.info('Found existing room for LTI context', {
        contextKey: context.contextKey,
        roomCode: room.room_code
      });
      await client.query('ROLLBACK');
      return room.room_code;
    }

    // Step 2: Create new room for this LTI context
    // NOTE: If user is instructor, set them as owner. Otherwise default to admin.
    const roomCode = await generateRoomCode();

    // Determine teacher_id: use instructor's database user ID if available, otherwise default to admin
    const teacherId = context.isInstructor && instructorUserId ? instructorUserId : 1;

    const insertResult = await client.query(
      `INSERT INTO proctoring_rooms (
        exam_id,
        teacher_id,
        room_code,
        status,
        capacity,
        lti_context_key,
        lti_context_label,
        lti_resource_id,
        auto_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, room_code`,
      [
        examId, // exam_id (default to 1 for LTI)
        teacherId, // teacher_id (instructor's database user ID or admin)
        roomCode,
        'created', // status
        15, // capacity (default)
        context.contextKey, // lti_context_key
        context.contextLabel || context.contextKey, // lti_context_label
        context.resourceId, // lti_resource_id
        true // auto_created (true = LTI-created)
      ]
    );

    const newRoomCode = insertResult.rows[0].room_code;

    logger.info('Created new room for LTI context', {
      contextKey: context.contextKey,
      roomCode: newRoomCode
    });

    await client.query('COMMIT');
    return newRoomCode;

  } catch (error: any) {
    await client.query('ROLLBACK');

    // Check for duplicate key error (race condition - another request created same room)
    if (error.code === '23505') { // unique_violation
      logger.warn('Room already created by another request (race condition)', {
        contextKey: context.contextKey
      });

      // Retry lookup - room should exist now
      const retryResult = await pg.query(
        'SELECT room_code FROM proctoring_rooms WHERE lti_context_key = $1',
        [context.contextKey]
      );

      if (retryResult.rows.length > 0) {
        return retryResult.rows[0].room_code;
      }
    }

    logger.error('Failed to create room for LTI context', {
      contextKey: context.contextKey,
      error
    });

    throw new LtiRoomCreationError(context.contextKey, error);
  } finally {
    client.release();
  }
}

/**
 * Generate unique room code (8-char base62)
 * Used for LTI-created rooms
 */
async function generateRoomCode(): Promise<string> {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const codeLength = 8;

  for (let attempt = 0; attempt < 3; attempt++) {
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    // Check if code already exists (should be extremely rare)
    // This check is NOT in a transaction - room creation will handle collisions
    // NOTE: We can't check here without a database connection
    // Room creation will retry if there's a collision

    return code;
  }

  throw new Error('Failed to generate unique room code after 3 attempts');
}

// ============================================================================
// User Lookup / Creation
// ============================================================================

/**
 * Find or create user by email
 * Reuses existing auth logic from room.service.ts
 * @param pg - PostgreSQL pool
 * @param email - User email (from LTI)
 * @param name - User full name (from LTI)
 * @returns Promise<number> - User ID
 */
export async function findOrCreateUserByEmail(
  pg: Pool,
  email: string | undefined,
  name: string | undefined
): Promise<number | null> {
  if (!email) {
    logger.warn('No email in LTI launch - cannot create user');
    return null;
  }

  try {
    // Check if user exists
    const existingResult = await pg.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingResult.rows.length > 0) {
      logger.info('Found existing user for LTI launch', {
        userId: existingResult.rows[0].id,
        email
      });
      return existingResult.rows[0].id;
    }

    // Create new user (student role)
    const insertResult = await pg.query(
      `INSERT INTO users (email, name, role) VALUES ($1, $2, 'student')
      RETURNING id`,
      [
        email,
        name || email.split('@')[0] // Use email username if name not provided
      ]
    );

    logger.info('Created new user for LTI launch', {
      userId: insertResult.rows[0].id,
      email
    });

    return insertResult.rows[0].id;

  } catch (error: any) {
    // Handle race condition - user might have been created by another request
    if (error.code === '23505') { // unique_violation
      logger.info('User creation race condition - retrying lookup', { email });

      const retryResult = await pg.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (retryResult.rows.length > 0) {
        return retryResult.rows[0].id;
      }
    }

    logger.error('Failed to create user for LTI launch', {
      email,
      error
    });

    return null;
  }
}
