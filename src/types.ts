export const SASURIE_COLLEGES = [
  'Sasurie College of Engineering',
  'Sasurie College of Arts & Science',
  'Sasurie College of Education',
  'Sasurie College of Nursing / Pharmacy',
  'Sasurie Polytechnic College',
] as const;

export type SasurieCollege = (typeof SASURIE_COLLEGES)[number];

export type Role =
  | 'principal'
  | 'secretary'
  | 'principal_pa'
  | 'secretary_pa'
  | 'admin'
  | 'staff'
  | 'librarian'
  | 'incucula';

export type CoordinatorRole =
  | 'General Faculty'
  | 'Event Coordinator'
  | 'Timetable Coordinator'
  | 'CDC Coordinator'
  | 'Placement Coordinator'
  | 'Exam Coordinator'
  | 'Class Advisor';

export type TaskStatus = 'Pending' | 'In Progress' | 'Submitted' | 'Completed' | 'Cancelled' | 'Overdue';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type StaffStatus = 'Active' | 'Inactive';

export type ObservationRating = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';

export interface User {
  username: string;
  role: Role;
  coordinatorRole?: CoordinatorRole;
  staffId?: string;
  name: string;
  department?: string;
  institution?: string;
  email?: string;
  mobile?: string;
  password?: string;
  avatarUrl?: string;
  googleConnected?: boolean;
}

export interface Staff {
  id: string; // Staff ID e.g., STF001
  facultyName: string;
  designation: string;
  department: string;
  institution?: string;
  mobile: string;
  email: string;
  password?: string;
  role: Role;
  coordinatorRole?: CoordinatorRole;
  status: StaffStatus;
}

export interface ClassRoom {
  id: string;
  year: string; // e.g., '1st Year', '2nd Year', '3rd Year', '4th Year'
  department: string;
  section: string; // e.g., 'A', 'B'
  classAdvisor: string; // Staff Name or Staff ID
  roomNumber: string;
  semester: string; // e.g., 'Sem 1', 'Sem 5'
  academicYear: string; // e.g., '2025-2026'
  courseCode?: string; // e.g., 'CS3501'
  courseName?: string; // e.g., 'Compiler Design'
  totalStudents?: number; // Fixed Student Strength set by HOD
}

export interface Task {
  id: string; // Task ID e.g., TSK-101
  title: string;
  description: string;
  category?: string;
  assignedToStaffId: string;
  assignedToName: string;
  classId?: string;
  className?: string;
  priority: TaskPriority;
  assignedDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  status: TaskStatus;
  remarks?: string;
  completionRemarks?: string;
  completionDate?: string;
  submittedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionRemarks?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  googleCalendarEventId?: string;
  googleCalendarLink?: string;
  googleClassroomCourseId?: string;
  googleClassroomWorkId?: string;
  googleClassroomLink?: string;
  googleTasksId?: string;
  googleTasksLink?: string;
  groupName?: string;
  isGroupTask?: boolean;
  department?: string;
  // Delegation chain tracking: Principal → HOD → Staff
  assignedByStaffId?: string;
  assignedByName?: string;
  assignedByRole?: 'principal' | 'hod' | 'staff';
  delegationLevel?: 1 | 2; // 1 = Principal → HOD, 2 = HOD → Staff
  parentTaskId?: string; // Links delegated task back to parent
}

export interface ClassObservation {
  id: string;
  date: string; // YYYY-MM-DD
  staffId: string;
  facultyName: string;
  classId: string;
  className: string;
  hour: string; // e.g., '1st Hour', '3rd Hour'
  subject: string;
  topic?: string;
  startingTime?: string;
  endingTime?: string;
  observedBy: string;
  observation: ObservationRating;
  criteriaRatings?: Record<string, 'Excellent' | 'Good' | 'Average' | 'Poor'>;
  strengths?: string[];
  improvements?: string[];
  remarks: string;
  followUpRequired: boolean;
}

export interface FacultyDailyMonitoring {
  id: string;
  date: string; // YYYY-MM-DD
  staffId: string;
  facultyName: string;
  classesHandled: string;
  attendanceUpdated: boolean;
  syllabusUpdated: boolean;
  assignedDuties: string;
  taskStatusSummary: string;
  classObservationDone: boolean;
  remarks: string;
}

export interface StudentAttendanceSummary {
  classId: string;
  className: string;
  department?: string;
  year?: string; // 'I Year', 'II Year', 'III Year', 'IV Year'
  section?: string; // e.g., 'A', 'B'
  totalStudents: number; // Fixed Strength set by HOD
  presentStudents: number; // Overall / Evening Present
  absentStudents?: number;
  odStudents?: number; // On Duty
  othersStudents?: number; // Leave / Suspended / Other
  attendancePercentage: number;
  
  // Morning Mentor Hour Attendance
  morningPresent?: number;
  morningAbsent?: number;
  morningOd?: number;
  morningOthers?: number;
  morningPercentage?: number;

  // Evening Mentor Hour Attendance
  eveningPresent?: number;
  eveningAbsent?: number;
  eveningOd?: number;
  eveningOthers?: number;
  eveningPercentage?: number;

    // Session Variation (Morning vs Evening Difference)
  variation?: number; // Difference in present count (morningPresent - eveningPresent)
  variationNote?: string;

  // Mentor who entered this summary
  enteredByName?: string;
  enteredById?: string;
  enteredAt?: string; // ISO timestamp
  date?: string; // YYYY-MM-DD — the day this summary belongs to
}

export interface StudentAttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  department: string;
  classId: string;
  className: string;
  year?: string;
  section?: string;
  totalStudents: number;
  presentStudents: number;
  absentStudents?: number;
  odStudents?: number;
  othersStudents?: number;
    attendancePercentage: number;
  markedBy?: string;
  markedById?: string;
  markedAt?: string; // ISO timestamp
  remarks?: string;

  // Morning Mentor Hour Attendance
  morningPresent?: number;
  morningAbsent?: number;
  morningOd?: number;
  morningOthers?: number;
  morningPercentage?: number;

  // Evening Mentor Hour Attendance
  eveningPresent?: number;
  eveningAbsent?: number;
  eveningOd?: number;
  eveningOthers?: number;
  eveningPercentage?: number;

  // Session Variation (Morning vs Evening Difference)
  variation?: number;
  variationNote?: string;
}

export const DEPARTMENTS = [
  'Artificial Intelligence & Data Science (AI & DS)',
  'Cyber Security (CYBER)',
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'MBA',
  'ME-CSE',
  'Science and Humanities',
] as const;

export type DepartmentType = typeof DEPARTMENTS[number];

export interface FacultyAttendanceCount {
  present: number;
  absent?: number;
  od?: number;
  permission?: number;
  total: number;
  absentNames?: string;
  remarks?: string;
}

export interface HODFacultyAttendanceRecord {
  id: string;
  department: string;
  collegeName: string;
  hodName: string;
  date: string; // YYYY-MM-DD
  facultyAttendanceCount: FacultyAttendanceCount;
}

export interface DailyHODReport {
  id: string;
  date: string; // YYYY-MM-DD
  department: string;
  hodName: string;
  hodEmail?: string;
  principalName?: string;
  collegeName: string;
  collegeLogoUrl?: string;
  collegeLogoText?: string;
  facultyAttendanceCount: FacultyAttendanceCount;
  assignedTasksCount: { total: number; completed: number; pending: number; overdue: number };
  classObservationsCount: number;
  studentAttendanceSummaries: StudentAttendanceSummary[];
  eventsConducted: string;
  naacWorkDone?: string;
  disciplineIssues: string;
  specialRemarks: string;
  hodRemarks: string;
  hodSignatureDate: string;
  reportType?: 'daily' | 'weekly';
  weeklyFridayDate?: string;
  weeklyReportStatus?: 'Draft' | 'Submitted to Principal' | 'Approved by Principal' | 'Needs Revision';
  principalComments?: string;
  principalApprovedDate?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'due_soon' | 'overdue' | 'completed' | 'daily_reminder' | 'info';
  read: boolean;
  relatedTaskId?: string;
}

export interface LessonPlanItem {
  id: string;
  staffId: string;
  staffName: string;
  classId?: string;
  className: string;
  courseCode: string;
  courseName: string;
  unitNo: 'Unit 1' | 'Unit 2' | 'Unit 3' | 'Unit 4' | 'Unit 5';
  unitName: string;
  topicName: string;
  planHours: number; // e.g. 1
  planDate: string; // YYYY-MM-DD
  coLevel: 'CO1' | 'CO2' | 'CO3' | 'CO4' | 'CO5' | 'NA';
  ptLevel: 'K1 - Remember' | 'K2 - Understand' | 'K3 - Apply' | 'K4 - Analyze' | 'K5 - Evaluate' | 'K6 - Create' | 'NA';
  pedagogy: 'Chalk & Talk' | 'PPT / ICT' | 'Flipped Classroom' | 'Group Discussion' | 'Problem Based Learning' | 'Seminar' | 'NA';
  status: 'Planned' | 'In Progress' | 'Completed';
  completedDate?: string;
  actualHours?: number;
  remarks?: string;
}

export interface FilterState {
  searchQuery: string;
  department: string;
  status: string;
  priority: string;
  dateRange: 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
  facultyId?: string;
  classId?: string;
}

export type EventType =
  | 'Workshop'
  | 'Seminar'
  | 'FDP'
  | 'Guest Lecture'
  | 'Hackathon'
  | 'Competition'
  | 'Club Activity'
  | 'Industrial Visit'
  | 'Other';

export type EventAssociation =
  | 'Department Association'
  | 'IEEE Student Branch'
  | 'CSI Student Chapter'
  | 'Fine Arts Club'
  | 'NSS (National Service Scheme)'
  | 'YRC (Youth Red Cross)'
  | 'Sports Club'
  | 'Entrepreneurship Cell (E-Cell)'
  | 'Women Empowerment Cell'
  | 'Institution\'s Innovation Council (IIC)'
  | 'Other';

export interface EventParticipant {
  id: string;
  rollNo: string;
  name: string;
  department: string;
  year: string;
  section: string;
  institution: string;
  attendance: 'Present' | 'Absent';
}

export interface EventGuestDetails {
  name: string;
  designation: string;
  organization: string;
  email: string;
  mobile: string;
  profile: string;
  photoUrl?: string;
}

export interface EventDocument {
  id: string;
  docType:
    | 'Invitation'
    | 'Brochure'
    | 'Circular'
    | 'Attendance Sheet'
    | 'Geo-tagged Photos'
    | 'Report PDF'
    | 'Budget Bills'
    | 'Certificate Sample'
    | 'Feedback Report'
    | 'Other';
  title: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface EventFeedbackQuestionRatings {
  overallRating: number;
  courseDelivery: number;
  communication: number;
  courseMaterial: number;
  arrangements: number;
  doubtClarification: number;
  practicalSessions: number;
  hospitality: number;
  examination: number;
}

export interface EventFeedbackResponse extends EventFeedbackQuestionRatings {
  id: string;
  participantRollNo?: string;
  participantName?: string;
  department?: string;
  submittedAt: string;
  suggestions?: string;
}

export interface EventRecord {
  id: string; // Event ID e.g., EVT-2026-001
  academicYear: string;
  semester: 'Odd' | 'Even';
  department: string;
  association: string;
  eventTitle: string;
  eventType: EventType;
  mode: 'Internal' | 'External';
  plannedDate: string;
  actualDate: string;
  venue: string;
  topic: string;
  resourcePersonName: string;
  organization: string;
  fundingType: 'Sponsored' | 'Self Supported' | 'Institute';
  budget: number;
  facultyCoordinator: string;
  hodApproval: 'Pending' | 'Approved' | 'Rejected';
  principalApproval: 'Pending' | 'Approved' | 'Rejected';
  eventStatus: 'Planned' | 'Completed' | 'Cancelled';
  
  guestDetails?: EventGuestDetails;
  participants: EventParticipant[];
  documents: EventDocument[];
  feedbackResponses: EventFeedbackResponse[];

  createdAt: string;
  updatedAt: string;
}

export interface CCMStudentMember {
  id: string;
  registerNo: string;
  name: string;
  category: 'Day Scholar' | 'Hosteller' | 'Class Representative' | 'High Performer' | 'Slow Learner';
  attendanceStatus: 'Present' | 'Absent';
}

export interface CCMCourseCoverage {
  id: string;
  courseCode: string;
  courseTitle: string;
  facultyName: string;
  plannedUnits: string;
  actualUnitsCompleted: string;
  statusOnSchedule: 'On Schedule' | 'Lagging' | 'Ahead';
  remarks?: string;
}

export interface CCMActionItem {
  id: string;
  issueDescription: string;
  category: 'Academics' | 'Lab Infrastructure' | 'Library / Books' | 'Teaching Pace' | 'General / Amenities';
  actionTaken: string;
  responsiblePerson: string;
  status: 'Open' | 'In Progress' | 'Resolved';
}

export interface CCMRecord {
  id: string;
  meetingNo: 'CCM 1' | 'CCM 2' | 'CCM 3' | 'Special CCM';
  academicYear: string;
  semester: 'Odd' | 'Even';
  department: string;
  className: string;
  meetingDate: string;
  chairpersonName: string;
  hodName: string;
  venue: string;
  studentMembers: CCMStudentMember[];
  courseCoverage: CCMCourseCoverage[];
  actionItems: CCMActionItem[];
  studentFeedbackPoints: string[];
  chairpersonRemarks: string;
  iqacStatus: 'Draft' | 'Submitted to IQAC' | 'Approved by IQAC';
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  registerNumber: string;
  name: string;
  department: string;
  year: string;
  section: string;
  batch: string;
  email?: string;
  mobile?: string;
  password?: string;
}

export type QuestionCategory =
  | 'CSE Cluster'
  | 'Core Engineering'
  | 'Circuits Branches'
  | 'AI & DS'
  | 'CSE / Cyber Security'
  | 'IT'
  | 'Other departments';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface SystemLog {
  id: string;
  timestamp: string; // ISO format string
  userId: string;
  userName: string;
  role: string;
  department: string;
  action: string;
  details: string;
}
