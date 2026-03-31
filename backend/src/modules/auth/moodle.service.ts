// ============================================================================
// Moodle Integration Service
// Handles authentication and user sync with Moodle LMS
// ============================================================================

import axios from 'axios';
import config from '../../config';
import logger from '../../config/logger';
import { MoodleError } from '../../utils/errors';

// ============================================================================
// Types
// ============================================================================

interface MoodleTokenResponse {
  token: string;
}

interface MoodleTokenErrorResponse {
  error: string;
  errorcode?: string;
  stacktrace?: string;
  debuginfo?: string;
}

interface MoodleSiteInfo {
  userid: number;
  username: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  lang?: string;
  userpictureurl?: string;
  siteurl: string;
  sitename: string;
}

interface MoodleUser {
  id: number;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  fullname?: string;
  userpictureurl?: string;
}

const TEACHER_ROLE_HINTS = [
  'admin',
  'teacher',
  'faculty',
  'instructor',
  'lecturer',
  'professor',
  'proctor',
  'invigilator'
];

export function inferMoodleRoleFromIdentity(identity: {
  username?: string;
  email?: string;
}): 'student' | 'teacher' {
  const normalizedUsername = identity.username?.trim().toLowerCase() || '';
  const normalizedEmail = identity.email?.trim().toLowerCase() || '';
  const emailLocalPart = normalizedEmail.split('@')[0] || '';

  const hasTeacherHint = (value: string) =>
    TEACHER_ROLE_HINTS.some(hint => value === hint || value.includes(hint));

  return hasTeacherHint(normalizedUsername) || hasTeacherHint(emailLocalPart)
    ? 'teacher'
    : 'student';
}

// ============================================================================
// Moodle Service
// ============================================================================

class MoodleService {
  private baseUrl: string;
  private serviceShortname: string;

  constructor() {
    this.baseUrl = config.moodle.baseUrl;
    this.serviceShortname = config.moodle.serviceShortname;
  }

  /**
   * Authenticate with Moodle and get token
   */
  async authenticate(username: string, password: string): Promise<string> {
    try {
      logger.info(`Authenticating user ${username} with Moodle`);

      const params = new URLSearchParams({
        username,
        password,
        service: this.serviceShortname,
      });

      const response = await axios.post<MoodleTokenResponse | MoodleTokenErrorResponse>(
        `${this.baseUrl}/login/token.php`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );

      if (response.status !== 200) {
        throw new MoodleError(`Moodle token endpoint failed (${response.status})`);
      }

      const data = response.data as MoodleTokenResponse | MoodleTokenErrorResponse;

      // Check if token is present
      if ('token' in data && typeof data.token === 'string' && data.token.length > 0) {
        logger.info(`User ${username} authenticated successfully with Moodle`);
        return data.token;
      }

      // Check if error is present
      if ('error' in data && typeof data.error === 'string') {
        const code = data.errorcode ? ` (${data.errorcode})` : '';
        throw new MoodleError(`${data.error}${code}`);
      }

      throw new MoodleError('Unexpected Moodle response from token endpoint');
    } catch (error) {
      if (error instanceof MoodleError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw new MoodleError(
          `Failed to connect to Moodle: ${error.message}`,
          503
        );
      }

      logger.error('Moodle authentication error:', error);
      throw new MoodleError('Authentication failed');
    }
  }

  /**
   * Validate token and get site info
   */
  async validateToken(token: string): Promise<MoodleSiteInfo> {
    try {
      const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_webservice_get_site_info',
        moodlewsrestformat: 'json',
      });

      const response = await axios.get<MoodleSiteInfo | { exception: string; message?: string; errorcode?: string }>(
        `${this.baseUrl}/webservice/rest/server.php`,
        { params }
      );

      if (response.status !== 200) {
        throw new MoodleError(`Moodle REST server failed (${response.status})`);
      }

      const data = response.data;

      // Check for exception
      if ('exception' in data) {
        const msg = typeof data.message === 'string' ? data.message : 'Moodle exception';
        const code = data.errorcode ? ` (${data.errorcode})` : '';
        throw new MoodleError(`${msg}${code}`);
      }

      // Return site info (this is the successful case)
      if ('userid' in data && typeof data.userid === 'number') {
        return data as MoodleSiteInfo;
      }

      throw new MoodleError('Unexpected Moodle response from site info');
    } catch (error) {
      if (error instanceof MoodleError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw new MoodleError(
          `Failed to validate token with Moodle: ${error.message}`,
          503
        );
      }

      logger.error('Moodle token validation error:', error);
      throw new MoodleError('Token validation failed');
    }
  }

  /**
   * Sync user from Moodle to database
   * Returns user role (student or teacher)
   */
  async syncUser(_moodleToken: string, siteInfo: MoodleSiteInfo): Promise<{
    userId: number;
    role: 'student' | 'teacher';
  }> {
    const role = inferMoodleRoleFromIdentity(siteInfo);

    if (role === 'teacher') {
      logger.info(`Resolved Moodle user ${siteInfo.username || siteInfo.email} as teacher`);
    }

    return {
      userId: siteInfo.userid,
      role,
    };
  }

  /**
   * Get Moodle user info from token
   */
  async getUserInfo(token: string): Promise<MoodleUser> {
    const siteInfo = await this.validateToken(token);

    return {
      id: siteInfo.userid,
      username: siteInfo.username,
      email: this.getResolvedEmail(siteInfo),
      firstname: siteInfo.firstname,
      lastname: siteInfo.lastname,
      fullname: `${siteInfo.firstname || ''} ${siteInfo.lastname || ''}`.trim(),
      userpictureurl: siteInfo.userpictureurl,
    };
  }

  getResolvedEmail(siteInfo: Pick<MoodleSiteInfo, 'email' | 'userid' | 'username'>): string {
    const normalizedEmail = siteInfo.email?.trim();

    if (normalizedEmail) {
      return normalizedEmail.toLowerCase();
    }

    const safeUsername =
      siteInfo.username?.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-') ||
      `moodle-user-${siteInfo.userid}`;

    return `${safeUsername}-${siteInfo.userid}@placeholder.local`;
  }
}

// Export singleton instance
export default new MoodleService();
