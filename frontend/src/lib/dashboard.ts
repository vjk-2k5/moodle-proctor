import type { StudentStatus } from '@app-types/index';
import type { TeacherAttempt } from '@/lib/backend';

export function getDisplayName(person: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();

  if (fullName) {
    return fullName;
  }

  return person.username || person.email || 'Unknown participant';
}

export function getRiskStatus(violationCount: number): StudentStatus {
  if (violationCount >= 5) {
    return 'suspicious';
  }

  if (violationCount > 0) {
    return 'warning';
  }

  return 'normal';
}

export function getAlertSeverity(violationCount: number): 'low' | 'medium' | 'high' {
  if (violationCount >= 5) {
    return 'high';
  }

  if (violationCount > 0) {
    return 'medium';
  }

  return 'low';
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function formatTimeOnly(value: string | null | undefined): string {
  if (!value) {
    return 'No timestamp';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function getAttemptTimestamp(attempt: Pick<TeacherAttempt, 'submittedAt' | 'startedAt'>): string {
  return formatTimeOnly(attempt.submittedAt || attempt.startedAt);
}

export function getAttemptStatusLabel(status: TeacherAttempt['status']): string {
  if (status === 'in_progress') {
    return 'Live';
  }

  if (status === 'submitted') {
    return 'Submitted';
  }

  if (status === 'terminated') {
    return 'Terminated';
  }

  return 'Not started';
}
