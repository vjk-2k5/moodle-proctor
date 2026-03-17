import type { Alert, ExamReport, Student } from "@app-types/index";

export const students: Student[] = [
  { id: "STU101", name: "John Doe", exam: "Physics Midterm", status: "normal", connection: "Excellent" },
  { id: "STU102", name: "Jane Smith", exam: "Physics Midterm", status: "warning", connection: "Good" },
  { id: "STU103", name: "Michael Johnson", exam: "Physics Midterm", status: "suspicious", connection: "Fair" },
  { id: "STU104", name: "Emily Davis", exam: "Math Final", status: "normal", connection: "Excellent" },
  { id: "STU105", name: "Daniel Wilson", exam: "Math Final", status: "normal", connection: "Good" },
  { id: "STU106", name: "Sophia Brown", exam: "Chemistry Quiz", status: "warning", connection: "Good" },
  { id: "STU107", name: "Olivia Miller", exam: "Chemistry Quiz", status: "normal", connection: "Excellent" },
  { id: "STU108", name: "Liam Martinez", exam: "Biology Lab", status: "suspicious", connection: "Poor" },
  { id: "STU109", name: "Noah Anderson", exam: "Biology Lab", status: "normal", connection: "Fair" },
  { id: "STU110", name: "Ava Thomas", exam: "History Essay", status: "warning", connection: "Good" },
  { id: "STU111", name: "William Taylor", exam: "History Essay", status: "normal", connection: "Excellent" },
  { id: "STU112", name: "Isabella Moore", exam: "Computer Science", status: "normal", connection: "Excellent" },
  { id: "STU113", name: "James Jackson", exam: "Computer Science", status: "suspicious", connection: "Fair" },
  { id: "STU114", name: "Mia White", exam: "English Literature", status: "normal", connection: "Good" },
  { id: "STU115", name: "Ethan Harris", exam: "English Literature", status: "warning", connection: "Fair" },
  { id: "STU116", name: "Charlotte Martin", exam: "Economics", status: "normal", connection: "Excellent" },
  { id: "STU117", name: "Benjamin Thompson", exam: "Economics", status: "normal", connection: "Good" },
  { id: "STU118", name: "Amelia Garcia", exam: "Philosophy", status: "suspicious", connection: "Poor" },
  { id: "STU119", name: "Lucas Martinez", exam: "Philosophy", status: "warning", connection: "Fair" },
  { id: "STU120", name: "Harper Robinson", exam: "Statistics", status: "normal", connection: "Good" }
];

export const monitoringStudents = students.slice(0, 10);

export const alerts: Alert[] = [
  {
    id: "AL1",
    studentId: "STU103",
    type: "multiple_faces",
    message: "Multiple faces detected in frame.",
    severity: "high",
    timestamp: "09:14:22"
  },
  {
    id: "AL2",
    studentId: "STU106",
    type: "phone_detected",
    message: "Potential phone detected near student.",
    severity: "medium",
    timestamp: "09:13:48"
  },
  {
    id: "AL3",
    studentId: "STU108",
    type: "left_screen",
    message: "Student left the active screen for 12 seconds.",
    severity: "high",
    timestamp: "09:11:03"
  },
  {
    id: "AL4",
    studentId: "STU115",
    type: "background_voice",
    message: "Background conversation detected.",
    severity: "medium",
    timestamp: "09:10:37"
  },
  {
    id: "AL5",
    studentId: "STU102",
    type: "left_screen",
    message: "Student gaze away from screen.",
    severity: "low",
    timestamp: "09:09:12"
  }
];

export const examReports: ExamReport[] = [
  { id: "RP1", studentName: "John Doe", exam: "Physics Midterm", alertsCount: 1, uploadStatus: "Completed" },
  { id: "RP2", studentName: "Jane Smith", exam: "Physics Midterm", alertsCount: 3, uploadStatus: "Completed" },
  { id: "RP3", studentName: "Michael Johnson", exam: "Physics Midterm", alertsCount: 5, uploadStatus: "Processing" },
  { id: "RP4", studentName: "Emily Davis", exam: "Math Final", alertsCount: 0, uploadStatus: "Completed" },
  { id: "RP5", studentName: "Daniel Wilson", exam: "Math Final", alertsCount: 2, uploadStatus: "Completed" },
  { id: "RP6", studentName: "Sophia Brown", exam: "Chemistry Quiz", alertsCount: 4, uploadStatus: "Failed" },
  { id: "RP7", studentName: "Olivia Miller", exam: "Chemistry Quiz", alertsCount: 1, uploadStatus: "Pending" },
  { id: "RP8", studentName: "Liam Martinez", exam: "Biology Lab", alertsCount: 6, uploadStatus: "Completed" }
];

