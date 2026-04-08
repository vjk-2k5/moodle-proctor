// ============================================================================
// Teacher Module - Service Layer
// Data retrieval for teacher dashboard
// ============================================================================

import { Pool } from 'pg';
import type {
  TeacherExam,
  TeacherExamListResponse,
  TeacherAttempt,
  TeacherAttemptListResponse,
  TeacherAttemptDetailsResponse,
  TeacherViolationListResponse,
  TeacherStudentListResponse,
  TeacherReportListResponse,
  TeacherStats,
  TeacherStatsResponse,
  ListAttemptsQuery,
  ListStudentsQuery,
  ListReportsQuery,
  GetStatsQuery
} from './teacher.schema';

export class TeacherService {
  constructor(private pg: Pool) {}

  private readonly allowedAttemptSortColumns: Record<NonNullable<ListAttemptsQuery['sortBy']>, string> = {
    created_at: 'ea.created_at',
    started_at: 'ea.started_at',
    submitted_at: 'ea.submitted_at',
    violation_count: 'ea.violation_count'
  };

  private buildAttemptWhereClause(
    query: {
      examId?: number;
      userId?: number;
      search?: string;
      includeHidden?: boolean;
      startDate?: string;
      endDate?: string;
    },
    options?: {
      status?: ListAttemptsQuery['status'];
      examColumn?: string;
      userColumn?: string;
      dateColumn?: string;
    }
  ): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    const examColumn = options?.examColumn || 'ea.exam_id';
    const userColumn = options?.userColumn || 'ea.user_id';
    const dateColumn = options?.dateColumn || 'ea.created_at';

    if (query.examId) {
      params.push(query.examId);
      conditions.push(`${examColumn} = $${params.length}`);
    }

    if (options?.status) {
      params.push(options.status);
      conditions.push(`ea.status = $${params.length}`);
    }

    if (query.userId) {
      params.push(query.userId);
      conditions.push(`${userColumn} = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(`(
        u.username ILIKE $${params.length} OR
        u.email ILIKE $${params.length} OR
        u.first_name ILIKE $${params.length} OR
        u.last_name ILIKE $${params.length} OR
        e.exam_name ILIKE $${params.length} OR
        e.course_name ILIKE $${params.length}
      )`);
    }

    if (!query.includeHidden) {
      conditions.push('ea.hidden_at IS NULL');
    }

    if (query.startDate) {
      params.push(query.startDate);
      conditions.push(`${dateColumn} >= $${params.length}`);
    }

    if (query.endDate) {
      params.push(query.endDate);
      conditions.push(`${dateColumn} <= $${params.length}`);
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  // ==========================================================================
  // Exams
  // ==========================================================================

  /**
   * List all exams with optional filters
   */
  async listExams(filters?: { examId?: number }): Promise<TeacherExamListResponse> {
    const params: any[] = [];
    const whereClause = filters?.examId
      ? (() => {
          params.push(filters.examId);
          return `WHERE e.id = $${params.length}`;
        })()
      : '';

    const query = `
      SELECT
        e.id,
        e.moodle_course_id as "moodleCourseId",
        e.moodle_course_module_id as "moodleCourseModuleId",
        e.exam_name as "examName",
        e.course_name as "courseName",
        e.duration_minutes as "durationMinutes",
        e.max_warnings as "maxWarnings",
        e.created_at as "createdAt",
        COUNT(DISTINCT ea.id) FILTER (WHERE ea.status = 'in_progress') as "activeAttempts",
        COUNT(DISTINCT ea.id) FILTER (WHERE ea.status = 'submitted') as "completedAttempts",
        COUNT(DISTINCT ea.id) as "totalAttempts"
      FROM exams e
      LEFT JOIN exam_attempts ea ON e.id = ea.exam_id AND ea.hidden_at IS NULL
      ${whereClause}
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;

    const result = await this.pg.query(query, params);

    return {
      success: true,
      data: {
        exams: result.rows.map(this.mapExamRow),
        total: result.rows.length
      }
    };
  }

  /**
   * Get exam details
   */
  async getExam(examId: number): Promise<TeacherExamListResponse> {
    const result = await this.pg.query(
      `SELECT
        e.id,
        e.moodle_course_id as "moodleCourseId",
        e.moodle_course_module_id as "moodleCourseModuleId",
        e.exam_name as "examName",
        e.course_name as "courseName",
        e.duration_minutes as "durationMinutes",
        e.max_warnings as "maxWarnings",
        e.created_at as "createdAt",
        COUNT(DISTINCT ea.id) FILTER (WHERE ea.status = 'in_progress') as "activeAttempts",
        COUNT(DISTINCT ea.id) FILTER (WHERE ea.status = 'submitted') as "completedAttempts",
        COUNT(DISTINCT ea.id) as "totalAttempts"
      FROM exams e
      LEFT JOIN exam_attempts ea ON e.id = ea.exam_id AND ea.hidden_at IS NULL
      WHERE e.id = $1
      GROUP BY e.id`,
      [examId]
    );

    if (result.rows.length === 0) {
      throw new Error('Exam not found');
    }

    return {
      success: true,
      data: {
        exams: [this.mapExamRow(result.rows[0])],
        total: 1
      }
    };
  }

  // ==========================================================================
  // Attempts
  // ==========================================================================

  /**
   * List attempts with filtering
   */
  async listAttempts(query: ListAttemptsQuery): Promise<TeacherAttemptListResponse> {
    const { clause: whereClause, params } = this.buildAttemptWhereClause(query, {
      status: query.status
    });
    const filterParamCount = params.length;

    // Default sort
    const sortBy = this.allowedAttemptSortColumns[query.sortBy || 'created_at'];
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const limit = Math.min(query.limit || 50, 100); // Max 100
    const offset = query.offset || 0;

    // Get attempts with count
    const dataQuery = `
      SELECT
        ea.id,
        ea.exam_id as "examId",
        ea.user_id as "userId",
        ea.status,
        ea.started_at as "startedAt",
        ea.submitted_at as "submittedAt",
        ea.submission_reason as "submissionReason",
        ea.violation_count as "violationCount",
        ea.ip_address as "ipAddress",
        ea.hidden_at as "hiddenAt",
        e.exam_name as "examName",
        e.course_name as "courseName",
        e.duration_minutes as "durationMinutes",
        e.max_warnings as "maxWarnings",
        u.username,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName"
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      JOIN users u ON ea.user_id = u.id
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${filterParamCount + 1} OFFSET $${filterParamCount + 2}
    `;

    params.push(limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM exam_attempts ea
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      this.pg.query(dataQuery, params),
      this.pg.query(countQuery, params.slice(0, filterParamCount))
    ]);

    return {
      success: true,
      data: {
        attempts: dataResult.rows.map(this.mapAttemptRow),
        total: parseInt(countResult.rows[0].count, 10),
        filters: query
      }
    };
  }

  /**
   * Get attempt details with violations and session info
   */
  async getAttemptDetails(attemptId: number): Promise<TeacherAttemptDetailsResponse> {
    // Get attempt with user and exam info
    const attemptResult = await this.pg.query(
      `SELECT
        ea.id,
        ea.exam_id as "examId",
        ea.user_id as "userId",
        ea.status,
        ea.started_at as "startedAt",
        ea.submitted_at as "submittedAt",
        ea.submission_reason as "submissionReason",
        ea.violation_count as "violationCount",
        ea.ip_address as "ipAddress",
        ea.hidden_at as "hiddenAt",
        e.exam_name as "examName",
        e.course_name as "courseName",
        e.moodle_course_id as "moodleCourseId",
        e.moodle_course_module_id as "moodleCourseModuleId",
        e.duration_minutes as "durationMinutes",
        e.max_warnings as "maxWarnings",
        u.username,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.profile_image_url as "profileImageUrl"
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      JOIN users u ON ea.user_id = u.id
      WHERE ea.id = $1`,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    const attempt = this.mapAttemptRow(attemptResult.rows[0]);

    // Get exam details
    const exam = this.mapExamRow(attemptResult.rows[0]);

    // Get user details
    const user = {
      id: attemptResult.rows[0].userId,
      username: attemptResult.rows[0].username,
      email: attemptResult.rows[0].email,
      firstName: attemptResult.rows[0].firstName,
      lastName: attemptResult.rows[0].lastName,
      profileImageUrl: attemptResult.rows[0].profileImageUrl
    };

    // Get violation summary
    const violationResult = await this.pg.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'warning') as warnings,
        COUNT(*) FILTER (WHERE severity = 'info') as info
      FROM violations
      WHERE attempt_id = $1`,
      [attemptId]
    );

    const violations = {
      total: parseInt(violationResult.rows[0].total, 10),
      warnings: parseInt(violationResult.rows[0].warnings, 10),
      info: parseInt(violationResult.rows[0].info, 10)
    };

    // Get proctoring session info
    const sessionResult = await this.pg.query(
      `SELECT
        id,
        session_start as "sessionStart",
        session_end as "sessionEnd",
        frames_processed as "framesProcessed",
        ai_service_connected as "aiServiceConnected"
      FROM proctoring_sessions
      WHERE attempt_id = $1
      ORDER BY session_start DESC
      LIMIT 1`,
      [attemptId]
    );

    const proctoringSession = sessionResult.rows.length > 0 ? sessionResult.rows[0] : undefined;

    return {
      success: true,
      data: {
        attempt,
        exam,
        user,
        violations,
        proctoringSession
      }
    };
  }

  // ==========================================================================
  // Violations
  // ==========================================================================

  /**
   * Get violations for an attempt
   */
  async getAttemptViolations(attemptId: number): Promise<TeacherViolationListResponse> {
    const violationsResult = await this.pg.query(
      `SELECT
        id,
        attempt_id as "attemptId",
        violation_type as "violationType",
        severity,
        detail,
        occurred_at as "occurredAt",
        metadata
      FROM violations
      WHERE attempt_id = $1
      ORDER BY occurred_at DESC`,
      [attemptId]
    );

    const violations = violationsResult.rows.map(row => ({
      id: row.id,
      attemptId: row.attemptId,
      violationType: row.violationType,
      severity: row.severity,
      detail: row.detail,
      occurredAt: row.occurredAt,
      metadata: row.metadata
    }));

    // Calculate summary
    const summary = {
      byType: {} as Record<string, number>,
      bySeverity: {
        info: 0,
        warning: 0
      }
    };

    for (const v of violations) {
      summary.byType[v.violationType] = (summary.byType[v.violationType] || 0) + 1;
      if (v.severity === 'info' || v.severity === 'warning') {
        summary.bySeverity[v.severity as 'info' | 'warning']++;
      }
    }

    return {
      success: true,
      data: {
        violations,
        total: violations.length,
        summary
      }
    };
  }

  // ==========================================================================
  // Students
  // ==========================================================================

  /**
   * List students
   */
  async listStudents(query: ListStudentsQuery): Promise<TeacherStudentListResponse> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    conditions.push("u.role = 'student'");

    if (query.search) {
      paramCount++;
      conditions.push(`(
        u.username ILIKE $${paramCount} OR
        u.email ILIKE $${paramCount} OR
        u.first_name ILIKE $${paramCount} OR
        u.last_name ILIKE $${paramCount}
      )`);
      params.push(`%${query.search}%`);
    }

    if (query.examId) {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1
        FROM exam_attempts ea
        WHERE ea.user_id = u.id
        AND ea.exam_id = $${paramCount}
      )`);
      params.push(query.examId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const dataQuery = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.role,
        u.profile_image_url as "profileImageUrl",
        u.last_login_at as "lastLoginAt"
      FROM users u
      ${whereClause}
      ORDER BY u.username ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as count FROM users u
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      this.pg.query(dataQuery, params.slice(0, paramCount + 2)),
      this.pg.query(countQuery, params.slice(0, paramCount))
    ]);

    return {
      success: true,
      data: {
        students: dataResult.rows.map(row => ({
          id: row.id,
          username: row.username,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          role: row.role,
          profileImageUrl: row.profileImageUrl,
          lastLoginAt: row.lastLoginAt
        })),
        total: parseInt(countResult.rows[0].count, 10)
      }
    };
  }

  // ==========================================================================
  // Reports
  // ==========================================================================

  /**
   * Generate reports
   */
  async listReports(query: ListReportsQuery): Promise<TeacherReportListResponse> {
    const { clause: whereClause, params } = this.buildAttemptWhereClause(query);
    let filterParamCount = params.length;

    if (query.minViolations) {
      params.push(query.minViolations);
      filterParamCount++;
      const prefix = whereClause ? `${whereClause} AND` : 'WHERE';
      const minViolationsClause = `${prefix} ea.violation_count >= $${filterParamCount}`;
      const limit = Math.min(query.limit || 100, 500);
      const offset = query.offset || 0;

      const dataQuery = `
      SELECT
        ea.id as "attemptId",
        e.exam_name as "examName",
        e.course_name as "courseName",
        TRIM(CONCAT(u.first_name, ' ', u.last_name)) as "studentName",
        u.email as "studentEmail",
        ea.status,
        ea.started_at as "startedAt",
        ea.submitted_at as "submittedAt",
        ea.submission_reason as "submissionReason",
        ea.violation_count as "violationCount",
        e.duration_minutes as "durationMinutes",
        ea.ip_address as "ipAddress"
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      JOIN users u ON ea.user_id = u.id
      ${minViolationsClause}
      ORDER BY ea.created_at DESC
      LIMIT $${filterParamCount + 1} OFFSET $${filterParamCount + 2}
    `;

      params.push(limit, offset);

      const countQuery = `
      SELECT COUNT(*) as count
      FROM exam_attempts ea
      ${minViolationsClause}
    `;

      const [dataResult, countResult] = await Promise.all([
        this.pg.query(dataQuery, params),
        this.pg.query(countQuery, params.slice(0, filterParamCount))
      ]);

      const reports = dataResult.rows.map(row => ({
        attemptId: row.attemptId,
        examName: row.examName,
        courseName: row.courseName,
        studentName: row.studentName,
        studentEmail: row.studentEmail,
        status: row.status,
        startedAt: row.startedAt,
        submittedAt: row.submittedAt,
        submissionReason: row.submissionReason,
        violationCount: row.violationCount,
        durationMinutes: row.durationMinutes,
        ipAddress: row.ipAddress,
        violations: {
          total: row.violationCount,
          byType: {}
        }
      }));

      return {
        success: true,
        data: {
          reports,
          total: parseInt(countResult.rows[0].count, 10)
        }
      };
    }

    const limit = Math.min(query.limit || 100, 500);
    const offset = query.offset || 0;

    const dataQuery = `
      SELECT
        ea.id as "attemptId",
        e.exam_name as "examName",
        e.course_name as "courseName",
        TRIM(CONCAT(u.first_name, ' ', u.last_name)) as "studentName",
        u.email as "studentEmail",
        ea.status,
        ea.started_at as "startedAt",
        ea.submitted_at as "submittedAt",
        ea.submission_reason as "submissionReason",
        ea.violation_count as "violationCount",
        e.duration_minutes as "durationMinutes",
        ea.ip_address as "ipAddress"
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      JOIN users u ON ea.user_id = u.id
      ${whereClause}
      ORDER BY ea.created_at DESC
      LIMIT $${filterParamCount + 1} OFFSET $${filterParamCount + 2}
    `;

    params.push(limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      JOIN users u ON ea.user_id = u.id
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      this.pg.query(dataQuery, params),
      this.pg.query(countQuery, params.slice(0, filterParamCount))
    ]);

    const reports = dataResult.rows.map(row => ({
      attemptId: row.attemptId,
      examName: row.examName,
      courseName: row.courseName,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      status: row.status,
      startedAt: row.startedAt,
      submittedAt: row.submittedAt,
      submissionReason: row.submissionReason,
      violationCount: row.violationCount,
      durationMinutes: row.durationMinutes,
      ipAddress: row.ipAddress,
      violations: {
        total: row.violationCount,
        byType: {}
      }
    }));

    return {
      success: true,
      data: {
        reports,
        total: parseInt(countResult.rows[0].count, 10)
      }
    };
  }

  async hideAttempt(attemptId: number, teacherId: number) {
    const result = await this.pg.query(
      `UPDATE exam_attempts
       SET hidden_at = NOW(),
           hidden_by_teacher_id = $2
       WHERE id = $1
       RETURNING id, hidden_at as "hiddenAt"`,
      [attemptId, teacherId]
    );

    if (result.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    return {
      success: true as const,
      data: {
        attemptId,
        hiddenAt: result.rows[0].hiddenAt,
        isHidden: true
      }
    };
  }

  async unhideAttempt(attemptId: number) {
    const result = await this.pg.query(
      `UPDATE exam_attempts
       SET hidden_at = NULL,
           hidden_by_teacher_id = NULL,
           hidden_reason = NULL
       WHERE id = $1
       RETURNING id`,
      [attemptId]
    );

    if (result.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    return {
      success: true as const,
      data: {
        attemptId,
        isHidden: false
      }
    };
  }

  async deleteAttempt(attemptId: number, teacherId: number) {
    const result = await this.pg.query(
      `DELETE FROM exam_attempts
       WHERE id = $1
       RETURNING id, exam_id as "examId", user_id as "userId"`,
      [attemptId]
    );

    if (result.rows.length === 0) {
      throw new Error('Attempt not found');
    }

    await this.pg.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, 'attempt_delete', 'attempt', $2, $3)`,
      [teacherId, attemptId, JSON.stringify({ examId: result.rows[0].examId, userId: result.rows[0].userId })]
    );

    return {
      success: true as const,
      data: {
        attemptId,
        deleted: true
      }
    };
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get dashboard statistics
   */
  async getStats(query: GetStatsQuery): Promise<TeacherStatsResponse> {
    const timeRange = query.timeRange || 'all';
    const params: any[] = [];
    const attemptConditions: string[] = [];
    const violationConditions: string[] = [];

    if (timeRange === 'hour') {
      attemptConditions.push(`ea.created_at >= NOW() - INTERVAL '1 hour'`);
      violationConditions.push(`ea.created_at >= NOW() - INTERVAL '1 hour'`);
    } else if (timeRange === 'day') {
      attemptConditions.push(`ea.created_at >= NOW() - INTERVAL '1 day'`);
      violationConditions.push(`ea.created_at >= NOW() - INTERVAL '1 day'`);
    } else if (timeRange === 'week') {
      attemptConditions.push(`ea.created_at >= NOW() - INTERVAL '1 week'`);
      violationConditions.push(`ea.created_at >= NOW() - INTERVAL '1 week'`);
    } else if (timeRange === 'month') {
      attemptConditions.push(`ea.created_at >= NOW() - INTERVAL '1 month'`);
      violationConditions.push(`ea.created_at >= NOW() - INTERVAL '1 month'`);
    }

    if (query.examId) {
      params.push(query.examId);
      const examCondition = `ea.exam_id = $${params.length}`;
      attemptConditions.push(examCondition);
      violationConditions.push(examCondition);
    }

    const attemptFilter = attemptConditions.length > 0 ? `AND ${attemptConditions.join(' AND ')}` : '';
    const attemptWhereConditions = ['ea.hidden_at IS NULL', ...attemptConditions];
    const attemptWhere = `WHERE ${attemptWhereConditions.join(' AND ')}`;
    const violationWhereConditions = ['ea.hidden_at IS NULL', ...violationConditions];
    const violationWhere = `WHERE ${violationWhereConditions.join(' AND ')}`;
    const examWhere = query.examId ? `WHERE e.id = $${params.length}` : '';

    // Get overview stats
    const overviewResult = await this.pg.query(
      `
      SELECT
        COUNT(DISTINCT e.id) as "totalExams",
        COUNT(ea.id) as "totalAttempts",
        COUNT(ea.id) FILTER (WHERE ea.status = 'in_progress') as "activeAttempts",
        COUNT(ea.id) FILTER (WHERE ea.status = 'submitted') as "completedAttempts",
        COUNT(ea.id) FILTER (WHERE ea.status = 'terminated') as "terminatedAttempts"
      FROM exams e
      LEFT JOIN exam_attempts ea ON e.id = ea.exam_id AND ea.hidden_at IS NULL ${attemptFilter}
      ${examWhere}
    `,
      params
    );

    // Get violation stats
    const violationsResult = await this.pg.query(
      `
      WITH filtered_violations AS (
        SELECT
          v.violation_type,
          v.severity,
          v.occurred_at
        FROM violations v
        JOIN exam_attempts ea ON v.attempt_id = ea.id
        ${violationWhere}
      ),
      violation_counts AS (
        SELECT
          violation_type,
          COUNT(*)::int as count
        FROM filtered_violations
        GROUP BY violation_type
      )
      SELECT
        (SELECT COUNT(*)::int FROM filtered_violations) as total,
        (SELECT COUNT(*)::int FROM filtered_violations WHERE occurred_at >= NOW() - INTERVAL '24 hours') as "inLast24Hours",
        COALESCE((SELECT json_object_agg(violation_type, count) FROM violation_counts), '{}'::json) as "byType",
        (SELECT COUNT(*)::int FROM filtered_violations WHERE severity = 'warning') as warnings,
        (SELECT COUNT(*)::int FROM filtered_violations WHERE severity = 'info') as info
    `,
      params
    );

    // Get student stats
    const studentsResult = await this.pg.query(
      `
      SELECT
        COUNT(DISTINCT u.id) as "total",
        COUNT(DISTINCT u.id) FILTER (WHERE ea.status = 'in_progress') as "active"
      FROM users u
      LEFT JOIN exam_attempts ea ON u.id = ea.user_id
      WHERE u.role = 'student' AND ea.hidden_at IS NULL ${attemptFilter}
    `,
      params
    );

    // Get exam status stats
    const examsResult = await this.pg.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE ea.status = 'in_progress') as "ongoing",
        COUNT(*) FILTER (WHERE ea.status = 'submitted') as "completed"
      FROM exam_attempts ea
      ${attemptWhere}
    `,
      params
    );

    const stats: TeacherStats = {
      overview: {
        totalExams: parseInt(overviewResult.rows[0]?.totalExams || '0', 10),
        totalAttempts: parseInt(overviewResult.rows[0]?.totalAttempts || '0', 10),
        activeAttempts: parseInt(overviewResult.rows[0]?.activeAttempts || '0', 10),
        completedAttempts: parseInt(overviewResult.rows[0]?.completedAttempts || '0', 10),
        terminatedAttempts: parseInt(overviewResult.rows[0]?.terminatedAttempts || '0', 10)
      },
      violations: {
        total: parseInt(violationsResult.rows[0]?.total || '0', 10),
        inLast24Hours: parseInt(violationsResult.rows[0]?.inLast24Hours || '0', 10),
        byType: violationsResult.rows[0]?.byType || {},
        bySeverity: {
          warning: parseInt(violationsResult.rows[0]?.warnings || '0', 10),
          info: parseInt(violationsResult.rows[0]?.info || '0', 10)
        }
      },
      students: {
        total: parseInt(studentsResult.rows[0]?.total || '0', 10),
        active: parseInt(studentsResult.rows[0]?.active || '0', 10)
      },
      exams: {
        upcoming: 0, // Would need exam scheduling data
        ongoing: parseInt(examsResult.rows[0]?.ongoing || '0', 10),
        completed: parseInt(examsResult.rows[0]?.completed || '0', 10)
      },
      timeRange,
      generatedAt: new Date()
    };

    return {
      success: true,
      data: stats
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private mapExamRow(row: any): TeacherExam {
    return {
      id: row.id,
      moodleCourseId: row.moodleCourseId,
      moodleCourseModuleId: row.moodleCourseModuleId,
      examName: row.examName,
      courseName: row.courseName,
      durationMinutes: parseInt(row.durationMinutes, 10),
      maxWarnings: parseInt(row.maxWarnings, 10),
      createdAt: row.createdAt,
      totalAttempts: parseInt(row.totalAttempts || '0', 10),
      activeAttempts: parseInt(row.activeAttempts || '0', 10),
      completedAttempts: parseInt(row.completedAttempts || '0', 10)
    };
  }

  private mapAttemptRow(row: any): TeacherAttempt {
    return {
      id: row.id,
      examId: row.examId,
      examName: row.examName,
      courseName: row.courseName,
      userId: row.userId,
      username: row.username,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.status,
      startedAt: row.startedAt,
      submittedAt: row.submittedAt,
      submissionReason: row.submissionReason,
      violationCount: row.violationCount,
      durationMinutes: row.durationMinutes,
      maxWarnings: row.maxWarnings,
      ipAddress: row.ipAddress,
      hiddenAt: row.hiddenAt,
      isHidden: Boolean(row.hiddenAt)
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createTeacherService(pg: Pool): TeacherService {
  return new TeacherService(pg);
}
