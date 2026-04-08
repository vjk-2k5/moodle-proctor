// ============================================================================
// E2E Test Helpers
// Utilities for database setup, test data management, and API calls
// ============================================================================

import { Pool } from 'pg';
import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ============================================================================
// Configuration
// ============================================================================

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const DB_CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/moodle_proctor_test';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ============================================================================
// Database Helper
// ============================================================================

export class DatabaseHelper {
  private pool: Pool;

  constructor(connectionString: string = DB_CONNECTION_STRING) {
    this.pool = new Pool({ connectionString });
  }

  async connect(): Promise<void> {
    await this.pool.connect();
    console.log('✅ Database connected');
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    console.log('✅ Database disconnected');
  }

  async cleanTestLtiData(): Promise<void> {
    await this.pool.query(`
      DELETE FROM room_enrollments
      WHERE user_email LIKE '%@example.com'
    `);

    await this.pool.query(`
      DELETE FROM proctoring_rooms
      WHERE lti_context_key LIKE 'test-%'
    `);

    await this.pool.query(`
      DELETE FROM users
      WHERE email LIKE '%@example.com'
    `);

    console.log('✅ Test data cleaned');
  }

  async getRoomByCode(roomCode: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM proctoring_rooms WHERE room_code = $1',
      [roomCode]
    );
    return result.rows[0];
  }

  async getEnrollmentCount(roomCode: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM room_enrollments re
       JOIN proctoring_rooms pr ON re.room_id = pr.id
       WHERE pr.room_code = $1`,
      [roomCode]
    );
    return parseInt(result.rows[0].count);
  }

  async updateRoomCapacity(roomCode: string, capacity: number): Promise<void> {
    await this.pool.query(
      'UPDATE proctoring_rooms SET capacity = $1 WHERE room_code = $2',
      [capacity, roomCode]
    );
  }

  async createTestRoom(overrides: Partial<any> = {}): Promise<any> {
    const roomCode = this.generateRoomCode();

    const result = await this.pool.query(
      `INSERT INTO proctoring_rooms (
        room_code, exam_id, teacher_id, status, capacity,
        duration_minutes, lti_context_key, auto_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        roomCode,
        overrides.exam_id || 1,
        overrides.teacher_id || 1,
        overrides.status || 'activated',
        overrides.capacity || 15,
        overrides.duration_minutes || 60,
        overrides.lti_context_key || 'test-context-' + Date.now(),
        overrides.auto_created !== false
      ]
    );

    return result.rows[0];
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TEST';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

// ============================================================================
// API Helper
// ============================================================================

export class ApiHelper {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = BACKEND_URL) {
    this.baseURL = baseURL;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async ltiLaunch(params: Record<string, string>): Promise<any> {
    const response = await axios.post(
      `${this.baseURL}/api/lti/launch`,
      new URLSearchParams(params),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: () => true,
      }
    );

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  }

  async validateToken(roomCode: string, token: string): Promise<any> {
    const response = await axios.post(
      `${this.baseURL}/api/room/${roomCode}/validate-token`,
      { token },
      {
        headers: this.getHeaders(),
        validateStatus: () => true,
      }
    );

    return {
      status: response.status,
      data: response.data,
    };
  }

  async joinRoom(roomCode: string, studentData: { studentName: string; studentEmail: string }): Promise<any> {
    const response = await axios.post(
      `${this.baseURL}/api/room/${roomCode}/join`,
      studentData,
      {
        headers: this.getHeaders(),
        validateStatus: () => true,
      }
    );

    return {
      status: response.status,
      data: response.data,
    };
  }

  async getActiveRooms(): Promise<any> {
    const response = await axios.get(
      `${this.baseURL}/api/room/active`,
      {
        headers: this.getHeaders(),
        validateStatus: () => true,
      }
    );

    return {
      status: response.status,
      data: response.data,
    };
  }

  async updateRoom(roomId: number, updates: { capacity: number }): Promise<any> {
    const response = await axios.put(
      `${this.baseURL}/api/room/${roomId}`,
      updates,
      {
        headers: this.getHeaders(),
        validateStatus: () => true,
      }
    );

    return {
      status: response.status,
      data: response.data,
    };
  }

  async closeRoom(roomId: number): Promise<any> {
    const response = await axios.post(
      `${this.baseURL}/api/room/${roomId}/close`,
      {},
      {
        headers: this.getHeaders(),
        validateStatus: () => true,
      }
    );

    return {
      status: response.status,
      data: response.data,
    };
  }
}

// ============================================================================
// LTI Helper
// ============================================================================

export class LtiHelper {
  private consumerKey: string;
  private consumerSecret: string;

  constructor(
    consumerKey: string = process.env.LTI_CONSUMER_KEY || 'moodle',
    consumerSecret: string = process.env.LTI_CONSUMER_SECRET || 'secret'
  ) {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  generateOAuthSignature(
    url: string,
    method: string,
    params: Record<string, string>
  ): string {
    // Sort parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    // Create signature base string
    const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

    // Generate signing key
    const signingKey = `${encodeURIComponent(this.consumerSecret)}&`;

    // Generate HMAC-SHA1 signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    return signature;
  }

  createLtiLaunchRequest(overrides: Partial<Record<string, string>> = {}): {
    url: string;
    params: Record<string, string>;
  } {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('base64');

    const baseParams = {
      oauth_consumer_key: this.consumerKey,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp.toString(),
      oauth_nonce: nonce,
      oauth_version: '1.0',
      lti_message_type: 'basic-lti-launch-request',
      lti_version: 'LTI-1p0',
      resource_link_id: 'test-resource-123',
      resource_link_title: 'Test Quiz',
      context_id: 'test-course-456',
      context_label: 'CS101',
      context_title: 'Introduction to Computer Science',
      user_id: 'test-user-789',
      roles: 'Learner',
      user_email: 'student@example.com',
      lis_person_name_full: 'Test Student',
      ...overrides
    };

    const url = `${BACKEND_URL}/api/lti/launch`;
    const signature = this.generateOAuthSignature(url, 'POST', baseParams);

    return {
      url,
      params: {
        ...baseParams,
        oauth_signature: signature
      }
    };
  }

  verifyJwtToken(token: string): any {
    return jwt.verify(token, JWT_SECRET);
  }

  extractRoomCodeFromHtml(html: string): string | null {
    const match = html.match(/room\/([A-Z0-9]{8})\?token=/);
    return match ? match[1] : null;
  }

  extractTokenFromHtml(html: string): string | null {
    const match = html.match(/token=([^"'&\s]+)/);
    return match ? match[1] : null;
  }
}

// ============================================================================
// Test Data Generator
// ============================================================================

export class TestDataGenerator {
  static randomEmail(): string {
    return `test-${Date.now()}@example.com`;
  }

  static randomName(): string {
    const adjectives = ['Happy', 'Clever', 'Swift', 'Bright', 'Keen'];
    const nouns = ['Student', 'Learner', 'Scholar', 'Pupil', 'Tester'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun} ${Date.now()}`;
  }

  static randomRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

// ============================================================================
// Assertions Helper
// ============================================================================

export class Assertions {
  static assertLtiSuccess(response: any): void {
    expect(response.status).toBe(200);
    expect(response.data).toContain('proctor://room/');
    expect(response.data).toContain('token=');
  }

  static assertLtiError(response: any, expectedError: string): void {
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.data).toContain(expectedError);
  }

  static assertTokenValidationSuccess(response: any): void {
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('roomCode');
    expect(response.data.data).toHaveProperty('capacity');
    expect(response.data.data).toHaveProperty('currentEnrolled');
  }

  static assertRoomJoinSuccess(response: any): void {
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toHaveProperty('enrollmentId');
    expect(response.data.data).toHaveProperty('roomCode');
    expect(response.data.data).toHaveProperty('enrollmentSignature');
  }

  static assertCapacityEnforced(response: any): void {
    expect(response.status).toBe(429);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toMatch(/full|capacity/i);
  }
}
