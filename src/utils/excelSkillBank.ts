import * as XLSX from 'xlsx';
import { StudentSkillBankData, StudentProfile, MonthKey, MONTH_LIST } from '../types/skillBank';
import { calculateStudentTotals } from '../data/mockSkillBank';
import { sanitizeDepartmentName } from './departmentUtils';

// Function to check if a student matches a target cohort year (e.g. 'I Year', 'II Year', 'III Year', 'IV Year')
export function isStudentInCohortYear(
  profile: { academicYear?: string; batch?: string; semester?: string } | undefined | null,
  targetYear: string
): boolean {
  if (!profile || !targetYear || targetYear === 'all') return true;

  const target = targetYear.trim().toLowerCase();
  const isTarget1st = target.includes('1st') || target.includes('i year') || target === '1' || target === 'i';
  const isTarget2nd = target.includes('2nd') || target.includes('ii year') || target === '2' || target === 'ii';
  const isTarget3rd = target.includes('3rd') || target.includes('iii year') || target === '3' || target === 'iii';
  const isTarget4th = target.includes('4th') || target.includes('iv year') || target === '4' || target === 'iv' || target.includes('final');

  const pYear = (profile.academicYear || '').trim().toLowerCase();
  const pSem = (profile.semester || '').trim().toLowerCase();
  const pBatch = (profile.batch || '').trim().toLowerCase();

  // Explicit Year String check on academicYear (e.g. '4th Year', 'IV Year', '3rd Year', 'III Year', '2nd Year', 'II Year', '1st Year', 'I Year')
  const is4thYear = pYear.includes('4th') || pYear.includes('iv') || pYear === '4' || pYear.includes('final') || pYear.includes('iv year');
  const is3rdYear = !is4thYear && (pYear.includes('3rd') || pYear.includes('iii') || pYear === '3' || pYear.includes('iii year'));
  const is2ndYear = !is4thYear && !is3rdYear && (pYear.includes('2nd') || pYear.includes('ii') || pYear === '2' || pYear.includes('ii year'));
  const is1stYear = !is4thYear && !is3rdYear && !is2ndYear && (pYear.includes('1st') || pYear === '1' || pYear.includes('i year') || (pYear.includes('i') && !pYear.includes('iii') && !pYear.includes('ii')));

  if (is4thYear) return isTarget4th;
  if (is3rdYear) return isTarget3rd;
  if (is2ndYear) return isTarget2nd;
  if (is1stYear) return isTarget1st;

  // Next Semester check
  if (pSem.includes('sem vii') || pSem.includes('sem viii') || pSem.includes('sem 7') || pSem.includes('sem 8')) {
    return isTarget4th;
  }
  if (pSem.includes('sem v') || pSem.includes('sem vi') || pSem.includes('sem 5') || pSem.includes('sem 6')) {
    return isTarget3rd;
  }
  if (pSem.includes('sem iii') || pSem.includes('sem iv') || pSem.includes('sem 3') || pSem.includes('sem 4')) {
    return isTarget2nd;
  }
  if (pSem.includes('sem i') || pSem.includes('sem ii') || pSem.includes('sem 1') || pSem.includes('sem 2')) {
    return isTarget1st;
  }

  // Next Batch check
  if (pBatch.includes('2022') || pBatch === '2022-2026') return isTarget4th;
  if (pBatch.includes('2023') || pBatch === '2023-2027') return isTarget3rd;
  if (pBatch.includes('2024') || pBatch === '2024-2028') return isTarget2nd;
  if (pBatch.includes('2025') || pBatch === '2025-2029') return isTarget1st;

  return false;
}

// Function to normalize student profile year, batch, and semester consistency & guarantee safe non-null structure
export function normalizeStudentSkillBankRecord(record: StudentSkillBankData): StudentSkillBankData {
  const defaults = createDefaultStudentSkillBankRecord({});
  if (!record) return defaults;

  const rawProf = record.studentProfile || ({} as StudentProfile);
  const prof: StudentProfile = {
    ...defaults.studentProfile,
    ...rawProf,
    studentName: rawProf.studentName || defaults.studentProfile.studentName || 'Student',
    registerNumber: String(rawProf.registerNumber || defaults.studentProfile.registerNumber || '732422100000').trim(),
    department: rawProf.department || defaults.studentProfile.department || 'Artificial Intelligence & Data Science (AI & DS)',
    academicYear: rawProf.academicYear || defaults.studentProfile.academicYear || '2nd Year',
    section: rawProf.section || defaults.studentProfile.section || 'A',
    batch: rawProf.batch || defaults.studentProfile.batch || '2024-2028',
    semester: rawProf.semester || defaults.studentProfile.semester || 'Sem III & IV',
    degreeBranch: rawProf.degreeBranch || defaults.studentProfile.degreeBranch || 'B.E. Computer Science & Engineering',
    mentorFaculty: rawProf.mentorFaculty || defaults.studentProfile.mentorFaculty || 'Unassigned',
    mentorStaffId: rawProf.mentorStaffId || defaults.studentProfile.mentorStaffId || '',
    studentEmail: rawProf.studentEmail || defaults.studentProfile.studentEmail || '',
    studentMobile: rawProf.studentMobile || defaults.studentProfile.studentMobile || '',
    skillBankAccountNo: rawProf.skillBankAccountNo || defaults.studentProfile.skillBankAccountNo || '',
  };

  const cleanedDepartment = sanitizeDepartmentName(prof.department);
  if (cleanedDepartment) {
    prof.department = cleanedDepartment;
  }

  const pYear = (prof.academicYear || '').trim().toLowerCase();
  const pSem = (prof.semester || '').trim().toLowerCase();
  const pBatch = (prof.batch || '').trim().toLowerCase();

  const is4th = pYear.includes('4th') || pYear.includes('iv') || pYear === '4' || pYear.includes('final') || pSem.includes('sem vii') || pSem.includes('sem viii') || pBatch.includes('2022');
  const is3rd = !is4th && (pYear.includes('3rd') || pYear.includes('iii') || pYear === '3' || pSem.includes('sem v') || pSem.includes('sem vi') || pBatch.includes('2023'));
  const is2nd = !is4th && !is3rd && (pYear.includes('2nd') || pYear.includes('ii') || pYear === '2' || pSem.includes('sem iii') || pSem.includes('sem iv') || pBatch.includes('2024'));
  const is1st = !is4th && !is3rd && !is2nd && (pYear.includes('1st') || pYear === '1' || pYear.includes('i year') || pSem.includes('sem i') || pSem.includes('sem ii') || pBatch.includes('2025'));

  if (is4th) {
    prof.academicYear = '4th Year';
    prof.batch = '2022-2026';
    prof.semester = 'Sem VII & VIII';
  } else if (is3rd) {
    prof.academicYear = '3rd Year';
    prof.batch = '2023-2027';
    prof.semester = 'Sem V & VI';
  } else if (is2nd) {
    prof.academicYear = '2nd Year';
    prof.batch = '2024-2028';
    prof.semester = 'Sem III & IV';
  } else if (is1st) {
    prof.academicYear = '1st Year';
    prof.batch = '2025-2029';
    prof.semester = 'Sem I & II';
  }

  return {
    ...defaults,
    ...record,
    studentProfile: prof,
    attendanceMonths: { ...defaults.attendanceMonths, ...(record.attendanceMonths || {}) },
    nptelMonths: { ...defaults.nptelMonths, ...(record.nptelMonths || {}) },
    leetCodeMonths: { ...defaults.leetCodeMonths, ...(record.leetCodeMonths || {}) },
    aptitudeMonths: { ...defaults.aptitudeMonths, ...(record.aptitudeMonths || {}) },
    feePayment: { ...defaults.feePayment, ...(record.feePayment || {}) },
    miniProjectChecklist: { ...defaults.miniProjectChecklist, ...(record.miniProjectChecklist || {}) },
    miniProjectDetails: record.miniProjectDetails || defaults.miniProjectDetails,
    ictToolsChecklist: { ...defaults.ictToolsChecklist, ...(record.ictToolsChecklist || {}) },
    examPerformance: { ...defaults.examPerformance, ...(record.examPerformance || {}) },
    subjectMarkDetails: record.subjectMarkDetails || defaults.subjectMarkDetails,
    learnerCategory: { ...defaults.learnerCategory, ...(record.learnerCategory || {}) },
    endSemResults: { ...defaults.endSemResults, ...(record.endSemResults || {}) },
    onlineCertBasic: record.onlineCertBasic || defaults.onlineCertBasic,
    advancedCourses: record.advancedCourses || defaults.advancedCourses,
    paperPresentations: record.paperPresentations || defaults.paperPresentations,
    resume: { ...defaults.resume, ...(record.resume || {}) },
    mockInterview: { ...defaults.mockInterview, ...(record.mockInterview || {}) },
    linkedIn: { ...defaults.linkedIn, ...(record.linkedIn || {}) },
    gitHub: { ...defaults.gitHub, ...(record.gitHub || {}) },
    socialMedia: { ...defaults.socialMedia, ...(record.socialMedia || {}) },
    hackathons: record.hackathons || defaults.hackathons,
    internship: { ...defaults.internship, ...(record.internship || {}) },
    workshop: { ...defaults.workshop, ...(record.workshop || {}) },
    collegeEvent: { ...defaults.collegeEvent, ...(record.collegeEvent || {}) },
    volunteering: { ...defaults.volunteering, ...(record.volunteering || {}) },
    professionalMemberships: record.professionalMemberships || defaults.professionalMemberships,
    sportsLogs: record.sportsLogs || defaults.sportsLogs,
    artsLogs: record.artsLogs || defaults.artsLogs,
    clubLogs: record.clubLogs || defaults.clubLogs,
    violations: record.violations || defaults.violations,
    counsellingLogs: record.counsellingLogs || defaults.counsellingLogs,
    parentMeetingLogs: record.parentMeetingLogs || defaults.parentMeetingLogs,
    transformationJourney: { ...defaults.transformationJourney, ...(record.transformationJourney || {}) },
  };
}

// Function to construct a default empty StudentSkillBankData record for new students imported via Excel
export function createDefaultStudentSkillBankRecord(data: Partial<{
  registerNumber: string;
  studentName: string;
  skillBankAccountNo: string;
  degreeBranch: string;
  department: string;
  batch: string;
  academicYear: string;
  semester: string;
  section: string;
  admissionNumber: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  bloodGroup: string;
  motherTongue: string;
  nationality: string;
  aadhaarNo: string;
  dateOfBirth: string;
  communicationAddress: string;
  pinCode: string;
  studentMobile: string;
  studentEmail: string;
  personalEmail: string;
  fatherName: string;
  fatherOccupation: string;
  fatherMobile: string;
  fatherEmail: string;
  motherName: string;
  motherOccupation: string;
  motherMobile: string;
  motherEmail: string;
  sslcSchool: string;
  hscSchool: string;
  yearOfPassing: string;
  admissionCategory: string;
  mentorFaculty: string;
  mentorStaffId: string;
  dreamCompany: string;
  careerGoal: string;
}>): StudentSkillBankData {
  const regNo = data.registerNumber || `7324${Math.floor(10000000 + Math.random() * 90000000)}`;
  const deptCode = data.department?.includes('ECE') ? 'ECE' : data.department?.includes('EEE') ? 'EEE' : 'CS';

  return {
    studentProfile: {
      id: `STU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      registerNumber: regNo,
      studentName: data.studentName || 'New Student',
      skillBankAccountNo: data.skillBankAccountNo || `SSB-2026-${deptCode}-${regNo.slice(-3)}`,
      degreeBranch: data.degreeBranch || 'B.E. Computer Science & Engineering',
      department: data.department || 'Computer Science & Engineering',
      batch: data.batch || '2023-2027',
      academicYear: data.academicYear || '2026-2027',
      semester: data.semester || 'Odd Semester (Sem V)',
      section: data.section || 'A',
      admissionNumber: data.admissionNumber || `SCE${regNo.slice(-6)}`,
      gender: data.gender || 'Male',
      age: data.age || 20,
      bloodGroup: data.bloodGroup || 'O+',
      motherTongue: data.motherTongue || 'Tamil',
      nationality: data.nationality || 'Indian',
      aadhaarNo: data.aadhaarNo || 'XXXX-XXXX-XXXX',
      dateOfBirth: data.dateOfBirth || '2005-01-01',
      communicationAddress: data.communicationAddress || 'Sasurie College Campus Hostels, Vijayamangalam',
      pinCode: data.pinCode || '638056',
      studentMobile: data.studentMobile || '9876543210',
      studentEmail: data.studentEmail || `${regNo}@sasurie.ac.in`,
      personalEmail: data.personalEmail || `${regNo}@gmail.com`,
      fatherName: data.fatherName || 'Father Name',
      fatherOccupation: data.fatherOccupation || 'Private Employee',
      fatherMobile: data.fatherMobile || '9876543211',
      fatherEmail: data.fatherEmail || 'father@gmail.com',
      motherName: data.motherName || 'Mother Name',
      motherOccupation: data.motherOccupation || 'Homemaker',
      motherMobile: data.motherMobile || '9876543212',
      motherEmail: data.motherEmail || 'mother@gmail.com',
      sslcSchool: data.sslcSchool || 'Govt Higher Secondary School',
      hscSchool: data.hscSchool || 'Govt Higher Secondary School',
      yearOfPassing: data.yearOfPassing || '2023',
      admissionCategory: (data.admissionCategory as 'Government Quota' | 'Management Quota' | 'Lateral Entry' | '7.5% Govt Quota') || 'Government Quota',
      mentorFaculty: data.mentorFaculty || 'M. Kaviyarasu (Asst. Prof / III Year Mentor)',
      mentorStaffId: data.mentorStaffId || 'STF001',
      dreamCompany: data.dreamCompany || 'Zoho Corp / TCS',
      careerGoal: data.careerGoal || 'Software Development Engineer',
      studentSigned: true,
      studentSignedDate: new Date().toISOString().split('T')[0],
      mentorSigned: true,
      mentorSignedDate: new Date().toISOString().split('T')[0],
      hodSigned: true,
      hodSignedDate: new Date().toISOString().split('T')[0],
    },
    attendanceMonths: {
      Jul: { totalDays: 0, daysAttended: 0, attendancePct: 0, additionalRemedialDays: 0, coinsEarned: 0 },
      Aug: { totalDays: 0, daysAttended: 0, attendancePct: 0, additionalRemedialDays: 0, coinsEarned: 0 },
      Sep: { totalDays: 0, daysAttended: 0, attendancePct: 0, additionalRemedialDays: 0, coinsEarned: 0 },
      Oct: { totalDays: 0, daysAttended: 0, attendancePct: 0, additionalRemedialDays: 0, coinsEarned: 0 },
      Nov: { totalDays: 0, daysAttended: 0, attendancePct: 0, additionalRemedialDays: 0, coinsEarned: 0 },
      Dec: { totalDays: 0, daysAttended: 0, attendancePct: 0, additionalRemedialDays: 0, coinsEarned: 0 },
    },
    libraryBooks: [],
    libraryVisits: [],
    feePayment: {
      tuitionFeePaid: false,
      hostelFeePaid: false,
      transportFeePaid: false,
      scholarshipReceived: false,
      scholarshipAmount: 0,
      scholarshipDate: '',
      examFeePaid: false,
      dateOfPayment: '',
      paymentBand: 'before_due',
      coinsEarned: 0,
      signedByStaff: false,
    },
    miniProjectChecklist: {
      topicSelectionApproved: false,
      proposalPrepared: false,
      literatureReview: false,
      developmentPlagiarismCheck: false,
      verificationDone: false,
      presentationVivaIPR: false,
      coinsEarned: 0,
    },
    miniProjectDetails: [],
    ictToolsChecklist: {
      joiningClassroom: false,
      submittingAssignmentOnTime: false,
      completingQuizTest: false,
      activeParticipation: false,
      disciplineEngagement: false,
      coinsEarned: 0,
    },
    examPerformance: {
      ciat1Appeared: false,
      ciat1Pct: 0,
      ciat2Appeared: false,
      ciat2Pct: 0,
      endSemAllPass: false,
      arrearCount: 0,
      coinsEarned: 0,
    },
    subjectMarkDetails: [],
    learnerCategory: {
      ciat1Category: 'Slow',
      ciat2Category: 'Slow',
      remedialAttendancePct: 0,
      remedialBonusEarned: false,
      coinsEarned: 0,
    },
    endSemResults: {
      allPass: false,
      arrearsCount: 0,
      gpa: 0,
      cgpa: 0,
      coinsEarned: 0,
    },
    nptelMonths: {
      Jul: { registrationDone: false, weeklyTestsDone: false, examApplied: false, resultStatus: 'None', coinsEarned: 0 },
      Aug: { registrationDone: false, weeklyTestsDone: false, examApplied: false, resultStatus: 'None', coinsEarned: 0 },
      Sep: { registrationDone: false, weeklyTestsDone: false, examApplied: false, resultStatus: 'None', coinsEarned: 0 },
      Oct: { registrationDone: false, weeklyTestsDone: false, examApplied: false, resultStatus: 'None', coinsEarned: 0 },
      Nov: { registrationDone: false, weeklyTestsDone: false, examApplied: false, resultStatus: 'None', coinsEarned: 0 },
      Dec: { registrationDone: false, weeklyTestsDone: false, examApplied: false, resultStatus: 'None', coinsEarned: 0 },
    },
    leetCodeMonths: {
      Jul: { taskCompleted: false, attendanceBand: '<60%', coinsEarned: 0 },
      Aug: { taskCompleted: false, attendanceBand: '<60%', coinsEarned: 0 },
      Sep: { taskCompleted: false, attendanceBand: '<60%', coinsEarned: 0 },
      Oct: { taskCompleted: false, attendanceBand: '<60%', coinsEarned: 0 },
      Nov: { taskCompleted: false, attendanceBand: '<60%', coinsEarned: 0 },
      Dec: { taskCompleted: false, attendanceBand: '<60%', coinsEarned: 0 },
    },
    onlineCertBasic: [],
    advancedCourses: [],
    paperPresentations: [],
    aptitudeMonths: {
      Jul: { attended: false, scoreBand: 'None', coinsEarned: 0 },
      Aug: { attended: false, scoreBand: 'None', coinsEarned: 0 },
      Sep: { attended: false, scoreBand: 'None', coinsEarned: 0 },
      Oct: { attended: false, scoreBand: 'None', coinsEarned: 0 },
      Nov: { attended: false, scoreBand: 'None', coinsEarned: 0 },
      Dec: { attended: false, scoreBand: 'None', coinsEarned: 0 },
    },
    resume: { workshopAttended: false, atsScorePct: 0, enteredByCDC: false, coinsEarned: 0 },
    mockInterview: { attended: false, performanceBand: 'Attended', enteredByCDC: false, coinsEarned: 0 },
    linkedIn: { profileCreated: false, originalPostCount: 0, repostCount: 0, coinsEarned: 0 },
    gitHub: { portfolioCompleted: false, assessmentBand: '<50', coinsEarned: 0 },
    socialMedia: { profileCreated: false, originalPostCount: 0, repostCount: 0, coinsEarned: 0 },
    hackathons: [],
    internship: { industryName: '', fromDate: '', toDate: '', totalDays: 0, type: 'Summer', internshipDone: false, certificateReceived: false, reportCompleted: false, fullTimeConverted: false, startupActivity: false, coinsEarned: 0 },
    workshop: { certificationCompleted: false, reportOnLearning: false, industrialVisitParticipation: false, coinsEarned: 0 },
    collegeEvent: { paidValueAddedCourse: false, eventParticipation: false, eventWinner: false, coinsEarned: 0 },
    volunteering: { nssNccActivity: false, communityAwareness: false, leadershipRole: false, coinsEarned: 0 },
    professionalMemberships: [],
    sportsLogs: [],
    artsLogs: [],
    clubLogs: [],
    violations: [],
    counsellingLogs: [],
    parentMeetingLogs: [],
    transformationJourney: {
      academicReflection: '',
      skillReflection: '',
      careerReflection: '',
      coCurricularReflection: '',
      extraCurricularReflection: '',
      checkpoint1Date: '',
      checkpoint1Coins: 0,
      checkpoint1Grade: 'E (Needs Improvement)',
      checkpoint2Date: '',
      checkpoint2Coins: 0,
      checkpoint2Grade: 'E (Needs Improvement)',
      finalGradeCoin: 0,
      finalGradeLetter: 'E (Needs Improvement)',
    },
  };
}

// Function to download Excel Template for HOD Bulk Import
export function downloadHODStudentTemplate() {
  const sampleRows = [
    {
      'Register Number': '732422104015',
      'Student Name': 'Kavya S. Sundaram',
      'Degree & Branch': 'B.E. Computer Science & Engineering',
      'Department': 'Computer Science & Engineering',
      'Batch': '2023-2027',
      'Semester': 'Odd Semester (Sem V)',
      'Section': 'A',
      'Mentor Faculty Name': 'M. Kaviyarasu (Asst. Prof / III Year Mentor)',
      'Student Mobile': '9876543220',
      'Student Email': 'kavya.sundaram@sasurie.ac.in',
      'Father Name': 'Sundaram S.',
      'Father Mobile': '9842109900',
      'Dream Company': 'Zoho Corporation',
      'Career Goal': 'Full Stack Java Developer',
    },
    {
      'Register Number': '732422104022',
      'Student Name': 'Dinesh Kumar M.',
      'Degree & Branch': 'B.E. Computer Science & Engineering',
      'Department': 'Computer Science & Engineering',
      'Batch': '2023-2027',
      'Semester': 'Odd Semester (Sem V)',
      'Section': 'A',
      'Mentor Faculty Name': 'M. Kaviyarasu (Asst. Prof / III Year Mentor)',
      'Student Mobile': '9876543221',
      'Student Email': 'dinesh.kumar@sasurie.ac.in',
      'Father Name': 'Manoharan K.',
      'Father Mobile': '9842109901',
      'Dream Company': 'TCS Digital',
      'Career Goal': 'Cloud Operations Engineer',
    },
    {
      'Register Number': '732422104038',
      'Student Name': 'Priya Dharshini P.',
      'Degree & Branch': 'B.E. Computer Science & Engineering',
      'Department': 'Computer Science & Engineering',
      'Batch': '2023-2027',
      'Semester': 'Odd Semester (Sem V)',
      'Section': 'B',
      'Mentor Faculty Name': 'M. Kaviyarasu (Asst. Prof / III Year Mentor)',
      'Student Mobile': '9876543222',
      'Student Email': 'priya.dharshini@sasurie.ac.in',
      'Father Name': 'Palanisamy V.',
      'Father Mobile': '9842109902',
      'Dream Company': 'Cognizant',
      'Career Goal': 'Data Analyst',
    },
    {
      'Register Number': '732423104008',
      'Student Name': 'Vignesh R.',
      'Degree & Branch': 'B.E. Computer Science & Engineering',
      'Department': 'Computer Science & Engineering',
      'Batch': '2024-2028',
      'Semester': 'Odd Semester (Sem III)',
      'Section': 'A',
      'Mentor Faculty Name': 'Dr. M. Karthikeyan (Asst. Prof / CSE)',
      'Student Mobile': '9876543223',
      'Student Email': 'vignesh.r@sasurie.ac.in',
      'Father Name': 'Ramasamy N.',
      'Father Mobile': '9842109903',
      'Dream Company': 'Infosys Power Programmer',
      'Career Goal': 'AI Engineer',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student_Master_Import');

  XLSX.writeFile(wb, 'Sasurie_SSB_Student_Master_Template.xlsx');
}

// Normalize a spreadsheet header so that "Register Number", "RegisterNumber",
// "Reg. No", "RegNo", "Roll No", "Mentor Staff ID", etc. all resolve to the
// same lookup key regardless of spacing / punctuation / casing.
export function normalizeHeaderKey(key: string): string {
  return String(key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Function to parse Excel / CSV File uploaded by HOD
export async function parseExcelStudentFile(file: File): Promise<StudentSkillBankData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // Rows dropped because they carry no register number / student name.
        let skippedRows = 0;

        const importedStudents: StudentSkillBankData[] = [];

        rawJson.forEach((row, rowIdx) => {
          // Build a normalized header lookup for THIS row so every export
          // format ("Register Number", "RegisterNumber", "Reg. No", "Roll No",
          // plus the mentor-mapping CSV columns) can be read reliably.
          const normRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normRow[normalizeHeaderKey(k)] = row[k];
          });

          const cell = (aliases: string[]): string => {
            for (const a of aliases) {
              const v = normRow[a];
              if (v !== undefined && v !== null && String(v).trim() !== '') {
                return String(v).trim();
              }
            }
            return '';
          };

          const regNo = cell([
            'registernumber',
            'regno',
            'registerno',
            'rollno',
            'sno',
            'studentid',
            'enrollmentno',
            'enrollmentnumber',
          ]);
          const studentName = cell(['studentname', 'name', 'candidatename', 'username']);

          // Rows without any identity are SKIPPED. The register number is the
          // primary key everywhere (Firestore doc id, mentor mappings,
          // attendance, skill bank) — fabricating a random number here is what
          // made CSV imports silently save the wrong students to the database.
          if (!regNo && !studentName) {
            skippedRows += 1;
            return;
          }

          const batchInput = cell(['batch', 'batchyear', 'admissionyear', 'yearofadmission']);
          const yearInput = cell(['yeargroup', 'year', 'academicyear', 'yearofstudy', 'studyyear', 'cohort']);
          const secInput = cell(['section', 'sec']) || 'A';
          const deptInput = cell(['department', 'dept', 'deptname']);
          const emailInput = cell(['studentemail', 'email', 'mailid', 'mail']);
          const mobileInput = cell(['studentmobile', 'mobile', 'phone', 'phonenumber', 'contactno']);
          const mentor =
            cell(['mentorfaculty', 'mentorfacultyname', 'mentorname', 'mentor']) ||
            'M. Kaviyarasu (Asst. Prof / III Year Mentor)';
          const mentorStaffId = cell(['mentorstaffid', 'mentorid', 'staffid', 'facultyid']);
          const semesterInput = cell(['semester']);
          const degreeBranchInput = cell(['degreebranch', 'branch', 'course', 'programme', 'program', 'degree']);

          // Most files label the cohort directly ("2nd Year" / "3rd Year"), but
          // some exports put the session ("2025-2026") in the Academic Year
          // column. In that case derive the cohort from the Batch intake year
          // (2025 -> 1st, 2024 -> 2nd, 2023 -> 3rd, 2022 -> 4th).
          let resolvedYear = yearInput;
          if (!/^(1st|2nd|3rd|4th|\d+\s*(st|nd|rd|th)?\s*year)/i.test(yearInput)) {
            const yearMatch = String(yearInput).match(/\d{4}/) || String(batchInput).match(/\d{4}/);
            const batchNum = yearMatch ? parseInt(yearMatch[0], 10) : NaN;
            if (!Number.isNaN(batchNum)) {
              if (batchNum >= 2025) resolvedYear = '1st Year';
              else if (batchNum === 2024) resolvedYear = '2nd Year';
              else if (batchNum === 2023) resolvedYear = '3rd Year';
              else if (batchNum <= 2022) resolvedYear = '4th Year';
            }
          }

          importedStudents.push(
            createDefaultStudentSkillBankRecord({
              registerNumber: regNo || `STU_TBD_${rowIdx + 1}`,
              studentName: studentName || 'Uploaded Student',
              academicYear: resolvedYear || '2nd Year',
              section: secInput || 'A',
              department: deptInput,
              degreeBranch: degreeBranchInput || 'B.E. Computer Science & Engineering',
              batch: batchInput || '',
              semester: semesterInput || '',
              mentorFaculty: mentor,
              mentorStaffId,
              studentMobile: mobileInput || '9876543210',
              studentEmail: emailInput || (regNo ? `${regNo.toLowerCase()}@sasurie.ac.in` : ''),
              fatherName: cell(['fathername']),
              fatherMobile: cell(['fathermobile', 'fathermobileno']),
              dreamCompany: cell(['dreamcompany', 'dream company']) || 'Zoho Corp',
              careerGoal: cell(['careergoal', 'career goal']) || 'Software Engineer',
            })
          );
        });

        if (skippedRows > 0) {
          console.warn(
            `[parseExcelStudentFile] Skipped ${skippedRows} row(s) with no register number / student name.`
          );
        }

        resolve(importedStudents);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================================
// SSB GRADE COIN SYSTEM — 5-DIMENSION SKILL BANK MONITORING
// Google-Sheet-ready matrix containing student identity (name, department,
// year-wise, mentor) plus all 5 Dimension coin sub-categories. HODs download
// this sample workbook, fill the coin cells, re-upload it, and the system + the
// synced Google Sheet are updated in one go.
// ============================================================================

// Derived grade letter from % of the 1,00,000 semester target
export function deriveSkillBankGrade(pct: number): string {
  if (pct >= 75) return 'O (Outstanding)';
  if (pct >= 60) return 'A+ (Excellent)';
  if (pct >= 50) return 'A (Very Good)';
  if (pct >= 40) return 'B+ (Good)';
  if (pct >= 33) return 'B (Average)';
  return 'C (Needs Improvement)';
}

// Identity columns that always travel with the monitoring matrix
export const MONITORING_IDENTITY_COLUMNS = [
  'Register Number',
  'SSB Account No',
  'Student Name',
  'Department',
  'Academic Year',
  'Batch',
  'Semester',
  'Section',
  'Mentor Faculty',
] as const;

// All 5-Dimension coin sub-columns (the values HODs fill / HOD-generated upload)
export const MONITORING_COIN_COLUMNS = [
  // Dimension 1 — Academic Excellence (cap 40,000)
  'D1_Attendance',
  'D1_Library',
  'D1_Library_Utilisation',
  'D1_Fee_Payment',
  'D1_Mini_Project',
  'D1_ICT_Tools',
  'D1_Exam_CIAT',
  'D1_Learner_Category',
  'D1_End_Sem',
  'D1_Sub_Total',
  // Dimension 2 — Skill Development (cap 15,000)
  'D2_NPTEL',
  'D2_LeetCode',
  'D2_Online_Certificates',
  'D2_Advanced_Courses',
  'D2_Paper_Presentations',
  'D2_Sub_Total',
  // Dimension 3 — Career Readiness (cap 15,000)
  'D3_Aptitude',
  'D3_Resume',
  'D3_Mock_Interview',
  'D3_LinkedIn',
  'D3_GitHub',
  'D3_Social_Media',
  'D3_Hackathon',
  'D3_Internship',
  'D3_Sub_Total',
  // Dimension 4 — Co-Curricular (cap 15,000)
  'D4_Workshop',
  'D4_College_Event',
  'D4_Volunteering',
  'D4_Memberships',
  'D4_Sub_Total',
  // Dimension 5 — Extra-Curricular (cap 15,000)
  'D5_Sports',
  'D5_Arts',
  'D5_Clubs',
  'D5_Sub_Total',
  // Grand totals
  'Gross_Total',
  'Deductions',
  'Net_Coins',
  'Pct_Of_Target',
  'Final_Grade',
];

export type SkillBankMonitoringRow = Record<string, string | number>;

// Build a single flattened monitoring row for one student
export function buildSkillBankMonitoringRow(student: StudentSkillBankData): SkillBankMonitoringRow {
  const p = student?.studentProfile || ({} as StudentProfile);
  const t = student ? calculateStudentTotals(student) : null;

  return {
    'Register Number': p.registerNumber || '',
    'SSB Account No': p.skillBankAccountNo || '',
    'Student Name': p.studentName || '',
    'Department': p.department || '',
    'Academic Year': p.academicYear || '',
    'Batch': p.batch || '',
    'Semester': p.semester || '',
    'Section': p.section || '',
    'Mentor Faculty': p.mentorFaculty || '',
    // D1
    'D1_Attendance': t?.d1.attendanceCoins ?? 0,
    'D1_Library': t?.d1.libraryCoins ?? 0,
    'D1_Library_Utilisation': t?.d1.libraryUtilCoins ?? 0,
    'D1_Fee_Payment': t?.d1.feeCoins ?? 0,
    'D1_Mini_Project': t?.d1.miniProjectCoins ?? 0,
    'D1_ICT_Tools': t?.d1.ictToolsCoins ?? 0,
    'D1_Exam_CIAT': t?.d1.examCoins ?? 0,
    'D1_Learner_Category': t?.d1.learnerCatCoins ?? 0,
    'D1_End_Sem': t?.d1.endSemCoins ?? 0,
    'D1_Sub_Total': t?.d1.cappedTotal ?? 0,
    // D2
    'D2_NPTEL': t?.d2.nptelCoins ?? 0,
    'D2_LeetCode': t?.d2.leetCodeCoins ?? 0,
    'D2_Online_Certificates': t?.d2.onlineBasicCoins ?? 0,
    'D2_Advanced_Courses': t?.d2.advancedCourseCoins ?? 0,
    'D2_Paper_Presentations': t?.d2.paperCoins ?? 0,
    'D2_Sub_Total': t?.d2.cappedTotal ?? 0,
    // D3
    'D3_Aptitude': t?.d3.aptitudeCoins ?? 0,
    'D3_Resume': t?.d3.resumeCoins ?? 0,
    'D3_Mock_Interview': t?.d3.mockInterviewCoins ?? 0,
    'D3_LinkedIn': t?.d3.linkedInCoins ?? 0,
    'D3_GitHub': t?.d3.gitHubCoins ?? 0,
    'D3_Social_Media': t?.d3.socialMediaCoins ?? 0,
    'D3_Hackathon': t?.d3.hackathonCoins ?? 0,
    'D3_Internship': t?.d3.internshipCoins ?? 0,
    'D3_Sub_Total': t?.d3.cappedTotal ?? 0,
    // D4
    'D4_Workshop': t?.d4.workshopCoins ?? 0,
    'D4_College_Event': t?.d4.eventCoins ?? 0,
    'D4_Volunteering': t?.d4.volunteeringCoins ?? 0,
    'D4_Memberships': t?.d4.membershipCoins ?? 0,
    'D4_Sub_Total': t?.d4.cappedTotal ?? 0,
    // D5
    'D5_Sports': t?.d5.sportsCoins ?? 0,
    'D5_Arts': t?.d5.artsCoins ?? 0,
    'D5_Clubs': t?.d5.clubCoins ?? 0,
    'D5_Sub_Total': t?.d5.cappedTotal ?? 0,
    // Grand totals
    'Gross_Total': t?.totalGrossEarned ?? 0,
    'Deductions': t?.totalDeductions ?? 0,
    'Net_Coins': t?.grandTotalNetCoins ?? 0,
    'Pct_Of_Target': t ? `${t.percentageOfTarget}%` : '0%',
    'Final_Grade': t ? deriveSkillBankGrade(t.percentageOfTarget) : '',
  };
}
// Build monitoring rows for a list of students (used by Google Sheets sync too)
export function buildSkillBankMonitoringRows(students: StudentSkillBankData[]): SkillBankMonitoringRow[] {
  return (students || []).map((s) => buildSkillBankMonitoringRow(s));
}

// Turn a monitoring row into a blank HOD-editable template row (identity kept, coins zeroed)
export function toBlankMonitoringTemplateRow(row: SkillBankMonitoringRow): SkillBankMonitoringRow {
  const blank: SkillBankMonitoringRow = {};
  MONITORING_IDENTITY_COLUMNS.forEach((c) => {
    blank[c] = row[c] ?? '';
  });
  MONITORING_COIN_COLUMNS.forEach((c) => {
    blank[c] = 0;
  });
  return blank;
}

function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((wch) => ({ wch }));
}

const IDENTITY_WIDTHS = [16, 14, 22, 26, 12, 12, 20, 10, 34];

// Download the sample 5-Dimension Skill Bank Monitoring workbook for HODs
export function downloadSkillBankMonitoringSampleSheet(students: StudentSkillBankData[]) {
  const liveRows = students && students.length ? buildSkillBankMonitoringRows(students) : [];
  const sampleIdentity: SkillBankMonitoringRow = {
    'Register Number': '732422104001',
    'Student Name': 'Sample Student',
    'Department': 'Computer Science & Engineering',
    'Academic Year': 'III Year',
    'Batch': '2023-2027',
    'Semester': 'Odd Semester (Sem V)',
    'Section': 'A',
    'Mentor Faculty': 'M. Kaviyarasu (Asst. Prof / III Year Mentor)',
  };
  const templateRows = liveRows.length
    ? liveRows.map(toBlankMonitoringTemplateRow)
    : [toBlankMonitoringTemplateRow(sampleIdentity)];

  const allCols = [...MONITORING_IDENTITY_COLUMNS, ...MONITORING_COIN_COLUMNS];
  const coinWidths = MONITORING_COIN_COLUMNS.map((c) => Math.max(12, c.length + 2));

  // Sheet 1 — Live 5-Dimension monitoring matrix (what gets synced to Google Sheets)
  const wsMatrix = XLSX.utils.json_to_sheet(liveRows);
  setColumnWidths(wsMatrix, [...IDENTITY_WIDTHS, ...coinWidths]);

  // Sheet 2 — HOD upload template (identity pre-filled, coin cells zeroed)
  const wsTemplate = XLSX.utils.json_to_sheet(templateRows);
  setColumnWidths(wsTemplate, [...IDENTITY_WIDTHS, ...coinWidths]);

  // Sheet 3 — Instructions for HODs
  const instructionRows = [
    { Step: '1', What_To_Do: 'Download this workbook and open the "HOD_Upload_Template" sheet.', Reference: 'Student Name, Department, Academic Year & Mentor are pre-filled for you.' },
    { Step: '2', What_To_Do: 'Enter the Grade Coins earned by each student under the 5 Dimension columns (D1 Attendance, D1 Library, D2 NPTEL, D3 Aptitude, D5 Sports, etc.).', Reference: 'Leave a cell 0 if the student earned nothing in that category.' },
    { Step: '3', What_To_Do: 'Do NOT edit the Sub_Total / Gross_Total / Net_Coins / Pct_Of_Target columns — the system re-computes them automatically with hard caps.', Reference: 'D1 cap 40,000 · D2 cap 15,000 · D3 cap 15,000 · D4 cap 15,000 · D5 cap 15,000 · Semester target 1,00,000 coins.' },
    { Step: '4', What_To_Do: 'Save the file and re-upload it using "Upload 5D Monitoring Sheet" so every student record is updated.', Reference: 'Register Number is the unique key for matching students.' },
    { Step: '5', What_To_Do: 'Use "Google Sheets Sync" to push the fully updated 5-Dimension matrix (name, department, year-wise, mentor) into your live Google Spreadsheet workbook.', Reference: 'Sync sends one row per student with all 5 Dimension totals.' },
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructionRows);
  setColumnWidths(wsInstructions, [8, 80, 60]);

  // Sheet 4 — Dimension coin matrix reference
  const dimMatrixRows = [
    { Dimension: 'Dimension 1', Name: 'Academic Excellence', Cap: 40000, Sub_Categories: 'Attendance · Library · Library Utilisation · Fee Payment · Mini Project · ICT Tools · Exam (CIAT) · Learner Category · End Sem' },
    { Dimension: 'Dimension 2', Name: 'Skill Development', Cap: 15000, Sub_Categories: 'NPTEL · LeetCode · Online Certificates · Advanced Courses · Paper Presentations' },
    { Dimension: 'Dimension 3', Name: 'Career Readiness', Cap: 15000, Sub_Categories: 'Aptitude · Resume · Mock Interview · LinkedIn · GitHub · Social Media · Hackathon · Internship' },
    { Dimension: 'Dimension 4', Name: 'Co-Curricular Performance', Cap: 15000, Sub_Categories: 'Workshop · College Event · Volunteering · Professional Memberships' },
    { Dimension: 'Dimension 5', Name: 'Extra-Curricular & Talent', Cap: 15000, Sub_Categories: 'Sports · Arts · Clubs' },
    { Dimension: 'Total', Name: 'Semester Grade Coin Target', Cap: 100000, Sub_Categories: 'Gross minus Deductions (Code of Conduct retraction) = Net Coins' },
  ];
  const wsDim = XLSX.utils.json_to_sheet(dimMatrixRows);
  setColumnWidths(wsDim, [14, 30, 12, 90]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMatrix, '5D_Monitoring_Matrix');
  XLSX.utils.book_append_sheet(wb, wsTemplate, 'HOD_Upload_Template');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions_HOD');
  XLSX.utils.book_append_sheet(wb, wsDim, 'Dimension_Matrix');

  XLSX.writeFile(wb, 'Sasurie_SSB_5D_SkillBank_Monitoring.xlsx');
}
// ------------------------- HOD 5D SHEET UPLOAD / PARSE -------------------------

function toNum(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(String(v).replace(/,/g, '').replace('%', ''));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

// Distribute a single coin total across the 6 months (Jul–Dec) for per-month records
function distributeMonthCoins<K>(
  months: Record<MonthKey, K>,
  value: number
): Record<MonthKey, K> {
  const next = { ...months };
  const per = Math.floor(value / MONTH_LIST.length);
  let rem = value - per * MONTH_LIST.length;
  MONTH_LIST.forEach((m) => {
    const cur = next[m] || ({} as K);
    let c = per;
    if (rem > 0) {
      c += 1;
      rem -= 1;
    }
    next[m] = { ...cur, coinsEarned: c } as K;
  });
  return next;
}

// Apply a parsed monitoring row back onto a student record (updates coin sub-fields)
export function applyMonitoringRowToRecord(
  record: StudentSkillBankData,
  row: SkillBankMonitoringRow
): StudentSkillBankData {
  const r: StudentSkillBankData = { ...record };

  // Dimension 1 — Attendance (distributed across months, coin-sum path)
  const attendance = toNum(row['D1_Attendance']);
  const months = { ...r.attendanceMonths };
  MONTH_LIST.forEach((m) => {
    months[m] = { ...months[m], totalDays: 0, daysAttended: 0, attendancePct: 0, additionalRemedialDays: 0, coinsEarned: 0 };
  });
  const per = Math.floor(attendance / MONTH_LIST.length);
  let rem = attendance - per * MONTH_LIST.length;
  MONTH_LIST.forEach((m) => {
    let c = per;
    if (rem > 0) {
      c += 1;
      rem -= 1;
    }
    months[m] = { ...months[m], coinsEarned: c };
  });
  r.attendanceMonths = months;

  r.libraryChecklist = {
    ...(r.libraryChecklist || { min5BooksBorrowed: false, onTimeReturnVerified: false, referenceAndJournalsBorrowed: false, digitalLibraryAccess: false, bookReviewSubmitted: false }),
    coinsEarned: Math.min(3000, toNum(row['D1_Library'])),
  };

  const libUtil = Math.min(500, toNum(row['D1_Library_Utilisation']));
  const visitsNeeded = Math.floor(libUtil / 20);
  r.libraryVisits = Array.from({ length: Math.min(25, visitsNeeded) }, (_, i) => ({
    id: `LIB-VISIT-IMPORT-${i + 1}`,
    month: MONTH_LIST[i % MONTH_LIST.length],
    date: '',
    inTime: '',
    outTime: '',
    verified: true,
  }));

  r.feePayment = { ...r.feePayment, coinsEarned: Math.min(5000, toNum(row['D1_Fee_Payment'])) };
  r.miniProjectChecklist = { ...r.miniProjectChecklist, coinsEarned: Math.min(2500, toNum(row['D1_Mini_Project'])) };
  r.ictToolsChecklist = { ...r.ictToolsChecklist, coinsEarned: Math.min(2500, toNum(row['D1_ICT_Tools'])) };
  r.examPerformance = { ...r.examPerformance, coinsEarned: Math.min(12000, toNum(row['D1_Exam_CIAT'])) };
  r.learnerCategory = { ...r.learnerCategory, coinsEarned: toNum(row['D1_Learner_Category']) };
  r.endSemResults = { ...r.endSemResults, coinsEarned: toNum(row['D1_End_Sem']) };

  // Dimension 2
  r.nptelMonths = distributeMonthCoins(r.nptelMonths, Math.min(3000, toNum(row['D2_NPTEL'])));
  r.leetCodeMonths = distributeMonthCoins(r.leetCodeMonths, Math.min(2000, toNum(row['D2_LeetCode'])));
  const onlineBasic = Math.min(1000, toNum(row['D2_Online_Certificates']));
  r.onlineCertBasic = onlineBasic > 0 ? [{ id: `CERT-${Date.now()}`, month: 'Jul', platform: 'Infosys Springboard', courseName: 'HOD Bulk Import Certificate', durationHrs: 12, proofAttached: true, coinsEarned: onlineBasic }] : [];
  const advanced = Math.min(2000, toNum(row['D2_Advanced_Courses']));
  r.advancedCourses = advanced > 0 ? [{ id: `ADV-${Date.now()}`, month: 'Jul', platform: 'AWS Academy', courseName: 'HOD Bulk Import Advanced Course', durationHrs: 30, verifiedProof: true, remarks: 'Bulk imported', coinsEarned: advanced }] : [];
  const paper = Math.min(2000, toNum(row['D2_Paper_Presentations']));
  r.paperPresentations = paper > 0 ? [{ id: `PAP-${Date.now()}`, month: 'Jul', level: 'National', symposiumName: 'Bulk Import', title: 'HOD Bulk Import Paper', venue: '', date: '', prizeWon: '', hasCertificate: true, coinsEarned: paper, remarks: '' }] : [];
  // Dimension 3
  r.aptitudeMonths = distributeMonthCoins(r.aptitudeMonths, Math.min(3000, toNum(row['D3_Aptitude'])));
  r.resume = { ...r.resume, coinsEarned: Math.min(2000, toNum(row['D3_Resume'])) };
  r.mockInterview = { ...r.mockInterview, coinsEarned: Math.min(2000, toNum(row['D3_Mock_Interview'])) };
  r.linkedIn = { ...r.linkedIn, coinsEarned: Math.min(2000, toNum(row['D3_LinkedIn'])) };
  r.gitHub = { ...r.gitHub, coinsEarned: Math.min(1000, toNum(row['D3_GitHub'])) };
  r.socialMedia = { ...r.socialMedia, coinsEarned: toNum(row['D3_Social_Media']) };
  const hack = Math.min(2000, toNum(row['D3_Hackathon']));
  r.hackathons = hack > 0 ? [{ id: `HACK-${Date.now()}`, month: 'Jul', eventName: 'Hackathon', participated: true, prizeWon: false, verifiedByEDC: true, coinsEarned: hack }] : [];
  r.internship = { ...r.internship, coinsEarned: Math.min(1000, toNum(row['D3_Internship'])) };

  // Dimension 4
  r.workshop = { ...r.workshop, coinsEarned: Math.min(4000, toNum(row['D4_Workshop'])) };
  r.collegeEvent = { ...r.collegeEvent, coinsEarned: Math.min(4000, toNum(row['D4_College_Event'])) };
  r.volunteering = { ...r.volunteering, coinsEarned: Math.min(4000, toNum(row['D4_Volunteering'])) };
  const membership = Math.min(3000, toNum(row['D4_Memberships']));
  r.professionalMemberships = membership > 0 ? [{ id: `MEM-${Date.now()}`, bodyName: 'IEEE', membershipType: 'Annual', dateOfIssue: '', validity: '', coinsEarned: membership }] : [];

  // Dimension 5
  const sports = Math.min(5000, toNum(row['D5_Sports']));
  r.sportsLogs = sports > 0 ? [{ id: `SPORT-${Date.now()}`, gameSport: 'Sports', participationLevel: 'Intra-college', venue: '', date: '', resultPosition: '', verifiedByPhysicalDirector: true, coinsEarned: sports }] : [];
  const arts = Math.min(5000, toNum(row['D5_Arts']));
  r.artsLogs = arts > 0 ? [{ id: `ARTS-${Date.now()}`, culturalCategory: 'Music', participationLevel: 'Cultural Participation', date: '', position: '', coinsEarned: arts }] : [];
  const club = Math.min(5000, toNum(row['D5_Clubs']));
  r.clubLogs = club > 0 ? [{ id: `CLUB-${Date.now()}`, clubName: 'Rotaract', role: 'Member', activityDetails: 'Bulk imported', date: '', coinsEarned: club }] : [];

  // Deductions (Code of Conduct retraction)
  const deductions = toNum(row['Deductions']);
  const existingViolations = Array.isArray(r.violations) ? r.violations : [];
  const nonImportedViolations = existingViolations.filter((v) => !(v.remarks || '').includes('HOD 5D Import'));
  r.violations = deductions > 0
    ? [...nonImportedViolations, { id: `VIOL-${Date.now()}`, date: '', type: 'Minor/Behavioral', category: 'Other', occurrenceNo: 1, deductionPct: 0, coinsDeducted: deductions, recordedBy: 'HOD', remarks: 'HOD 5D Import' }]
    : nonImportedViolations;

  return r;
}
// Parse the uploaded HOD 5-Dimension monitoring workbook and return updated records
export async function parseSkillBankMonitoringSheet(
  file: File,
  existingStudents: StudentSkillBankData[]
): Promise<{ updated: StudentSkillBankData[]; created: StudentSkillBankData[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const byRegNo = new Map<string, StudentSkillBankData>();
        (existingStudents || []).forEach((s) => {
          const key = (s.studentProfile?.registerNumber || '').trim().toLowerCase();
          if (key) byRegNo.set(key, s);
        });

        const updated: StudentSkillBankData[] = [];
        const created: StudentSkillBankData[] = [];

        rawJson.forEach((row) => {
          const regNo = String(
            row['Register Number'] || row['Reg No'] || row['regNo'] || row['RegisterNumber'] || ''
          ).trim();
          const name = String(row['Student Name'] || row['Name'] || '').trim();

          if (!regNo && !name) return;

          const existing = regNo ? byRegNo.get(regNo.toLowerCase()) : undefined;
          if (existing) {
            updated.push(applyMonitoringRowToRecord(existing, row));
          } else if (regNo || name) {
            const newRecord = createDefaultStudentSkillBankRecord({
              registerNumber: regNo || `7324${Math.floor(10000000 + Math.random() * 90000000)}`,
              studentName: name || 'Uploaded Student',
              department: String(row['Department'] || row['Dept'] || 'Computer Science & Engineering'),
              academicYear: String(row['Academic Year'] || 'III Year'),
              batch: String(row['Batch'] || '2023-2027'),
              semester: String(row['Semester'] || 'Odd Semester (Sem V)'),
              section: String(row['Section'] || 'A'),
              mentorFaculty: String(row['Mentor Faculty'] || row['Mentor'] || 'M. Kaviyarasu (Asst. Prof / III Year Mentor)'),
            });
            created.push(applyMonitoringRowToRecord(newRecord, row));
          }
        });

        resolve({ updated, created });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
