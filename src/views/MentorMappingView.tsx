import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { StudentSkillBankData, StudentProfile } from '../types/skillBank';
import { stripSkillBankDates } from '../data/mockSkillBank';
import {
  createDefaultStudentSkillBankRecord,
  isStudentInCohortYear,
  normalizeStudentSkillBankRecord,
  parseExcelStudentFile,
} from '../utils/excelSkillBank';
import { getScopedStudents, getScopedStaff } from '../utils/departmentUtils';
import { syncDocToFirestore } from '../lib/firestoreSync';
import {
  Users,
  Upload,
  Download,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  UserCheck,
  X,
  UserPlus,
  ChevronDown,
  Trash2,
  Filter,
  RefreshCw,
  Database,
  Check,
} from 'lucide-react';

export const MentorMappingView: React.FC = () => {
  const {
    currentUser,
    dailyReport,
    skillBankStudents,
    staffList,
    classList,
    bulkMapStudentsToMentor,
    importBulkSkillBankStudents,
    deleteSkillBankStudent,
    deleteSkillBankStudents,
    clearDepartmentSkillBankStudents,
    clearAllSkillBankStudents,
    addSkillBankStudent,
    mentorMappings,
    filterState,
  } = useApp();

  const selectedDept = filterState?.department;
  const fallbackDept = (selectedDept && selectedDept !== 'all' && selectedDept !== 'All Departments')
    ? selectedDept
    : (currentUser?.department && currentUser.department !== 'College Principal Office' ? currentUser.department : (dailyReport?.department || 'Artificial Intelligence & Data Science (AI & DS)'));
  const activeDeptName = fallbackDept;

  const shortDeptCode = React.useMemo(() => {
    const d = activeDeptName.toLowerCase();
    if (d.includes('cyber')) return 'CYBER';
    if (d.includes('electronics') || d.includes('ece')) return 'ECE';
    if (d.includes('computer science') || d.includes('cse')) return 'CSE';
    if (d.includes('electrical') || d.includes('eee')) return 'EEE';
    if (d.includes('mechanical') || d.includes('mech')) return 'MECH';
    if (d.includes('civil')) return 'CIVIL';
    if (d.includes('information technology') || d.includes('it')) return 'IT';
    if (d.includes('artificial') || d.includes('ai & ds') || d.includes('aids')) return 'AI & DS';
    return (activeDeptName || '').split(' ')[0] || 'DEPT';
  }, [activeDeptName]);

  const scopedStudents = React.useMemo(() => getScopedStudents(skillBankStudents, currentUser, fallbackDept), [skillBankStudents, currentUser, fallbackDept]);
  const scopedStaff = React.useMemo(() => getScopedStaff(staffList, currentUser, fallbackDept), [staffList, currentUser, fallbackDept]);

  // Database Sync state
  const [dbSyncing, setDbSyncing] = useState<boolean>(false);
  const [dbSyncedSuccess, setDbSyncedSuccess] = useState<boolean>(false);

  // Allocation confirmation message state
  const [allocationMessage, setAllocationMessage] = useState<string>('');
  const [allocationMessageType, setAllocationMessageType] = useState<'success' | 'error'>('success');

  const showAllocationMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setAllocationMessage(message);
    setAllocationMessageType(type);
    setTimeout(() => setAllocationMessage(''), 4000);
  };

  const handleSyncAllToFirestore = async () => {
    setDbSyncing(true);
    try {
      // 1) Push every scoped student (mentor-mentee data lives on the student too)
      for (const student of scopedStudents) {
        const docId = student.studentProfile.registerNumber.replace(/\//g, '_');
        await syncDocToFirestore('skillBankStudents', docId, student);
      }

      // 2) Push the dedicated Mentor → Mentee mapping docs for this department
      const scopedMentorIds = new Set(scopedStaff.map((s) => String(s.id).trim().toLowerCase()));
      const mappingsToSave = mentorMappings.filter((m) =>
        scopedMentorIds.has(String(m.mentorStaffId).trim().toLowerCase())
      );
      for (const m of mappingsToSave) {
        await syncDocToFirestore('mentorMappings', m.mentorStaffId, {
          ...m,
          updatedAt: new Date().toISOString(),
        });
      }

      setDbSyncedSuccess(true);
      setTimeout(() => setDbSyncedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to sync to Firestore database:', err);
    } finally {
      setDbSyncing(false);
    }
  };

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedMentorFilter, setSelectedMentorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mentor Class Quick Map State (per staff mapping)
  const [rowMapYear, setRowMapYear] = useState<Record<string, string>>({});
  const [rowMapSec, setRowMapSec] = useState<Record<string, string>>({});

  // Mentor Attendance Modal State
  const [selectedMentorForAttendance, setSelectedMentorForAttendance] = useState<any | null>(null);

  // Bulk Selection State
  const [selectedRegNumbers, setSelectedRegNumbers] = useState<string[]>([]);
  const [targetMentorStaffId, setTargetMentorStaffId] = useState<string>(scopedStaff[0]?.id || 'STF001');

  // Modals State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);
  const [parsedPreviewStudents, setParsedPreviewStudents] = useState<StudentSkillBankData[]>([]);
  const [importMentorStaffId, setImportMentorStaffId] = useState<string>(scopedStaff[0]?.id || 'STF001');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');

  // Single Manual Student Form State
  const [manualForm, setManualForm] = useState({
    registerNumber: '',
    studentName: '',
    year: '2nd Year',
    department: currentUser?.department || 'Artificial Intelligence & Data Science (AI & DS)',
    section: 'A',
    email: '',
    mobile: '',
    mentorStaffId: scopedStaff[0]?.id || 'STF001',
  });

  // Map entire class (Year & Section) to a specific Mentor
  const handleMapEntireClassToMentor = (staffId: string, yearVal: string, secVal: string) => {
    const staff = scopedStaff.find((s) => s.id === staffId) || staffList.find((s) => s.id === staffId);
    if (!staff) return;

    const matchingStudents = scopedStudents.filter((s) => {
      const p = s.studentProfile;
      let mYear = true;
      if (yearVal !== 'all') {
        const pYear = (p.academicYear || '').toLowerCase();
        const tYear = yearVal.toLowerCase();
        mYear =
          pYear.includes(tYear) ||
          (tYear.includes('2nd') && (pYear.includes('2') || pYear.includes('ii'))) ||
          (tYear.includes('3rd') && (pYear.includes('3') || pYear.includes('iii'))) ||
          (tYear.includes('1st') && (pYear.includes('1') || pYear.includes('i'))) ||
          (tYear.includes('4th') && (pYear.includes('4') || pYear.includes('iv')));
      }
      let mSec = true;
      if (secVal !== 'all') {
        const pSec = (p.section || '').trim().toLowerCase();
        const tSec = secVal.trim().toLowerCase();
        mSec = pSec === tSec || pSec === `sec ${tSec}` || pSec.includes(tSec);
      }
      return mYear && mSec;
    });

    if (matchingStudents.length === 0) {
      alert(
        `No students found for ${yearVal === 'all' ? 'All Years' : yearVal} ${
          secVal === 'all' ? 'All Sections' : 'Sec ' + secVal
        } in ${activeDeptName}. Please upload or add students for this class first.`
      );
      return;
    }

    const regNumbers = matchingStudents.map((s) => s.studentProfile.registerNumber);
    bulkMapStudentsToMentor(regNumbers, staff.id, staff.facultyName).then((result) => {
      if (result.success) {
        showAllocationMessage(result.message, 'success');
      } else {
        showAllocationMessage(result.message, 'error');
      }
    });
  };

  const handleClearAllDeptMentees = async () => {
    if (skillBankStudents.length === 0 && scopedStudents.length === 0) {
      alert('There are no student or mentee records to delete.');
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to PERMANENTLY DELETE ALL student and mentee records for ${activeDeptName} from the database? This will clear all data so HOD and Mentors can enter fresh new mentee entries.`
      )
    ) {
      await clearDepartmentSkillBankStudents(activeDeptName);
      setSelectedRegNumbers([]);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-sync targetMentorStaffId when scopedStaff changes
  React.useEffect(() => {
    if (scopedStaff.length > 0 && !scopedStaff.some((s) => s.id === targetMentorStaffId)) {
      setTargetMentorStaffId(scopedStaff[0].id);
    }
  }, [scopedStaff, targetMentorStaffId]);

  // Filter Students
  const filteredStudents = scopedStudents.filter((s) => {
    if (!s || !s.studentProfile) return false;
    const profile = s.studentProfile;
    // Year filter (e.g. 2nd Year / II YEAR)
    let matchesYear = true;
    if (selectedYear !== 'all') {
      matchesYear = isStudentInCohortYear(profile, selectedYear);
    }

    // Section filter (e.g. A, B, C or Sec A)
    let matchesSection = true;
    if (selectedSection !== 'all') {
      const pSec = (profile.section || '').trim().toLowerCase();
      const targetSec = selectedSection.trim().toLowerCase();
      matchesSection = pSec === targetSec || pSec === `sec ${targetSec}` || pSec.includes(targetSec);
    }

    // Mentor Filter
    let matchesMentor = true;
    if (selectedMentorFilter === 'unassigned') {
      matchesMentor = !profile.mentorFaculty || profile.mentorFaculty === 'Unassigned' || profile.mentorFaculty === '';
    } else if (selectedMentorFilter !== 'all') {
      matchesMentor = profile.mentorFaculty === selectedMentorFilter || profile.mentorStaffId === selectedMentorFilter;
    }

    // Search Query
    const q = (searchQuery || '').toLowerCase();
    const matchesQuery =
      (profile.studentName || '').toLowerCase().includes(q) ||
      (profile.registerNumber || '').toLowerCase().includes(q) ||
      (profile.skillBankAccountNo || '').toLowerCase().includes(q) ||
      (profile.mentorFaculty || '').toLowerCase().includes(q);

    return matchesYear && matchesSection && matchesMentor && matchesQuery;
  });

  // Calculate Stats
  const totalStudentsCount = scopedStudents.length;
  const mappedCount = scopedStudents.filter(
    (s) => s?.studentProfile?.mentorFaculty && s.studentProfile.mentorFaculty !== 'Unassigned' && s.studentProfile.mentorFaculty !== ''
  ).length;
  const unassignedCount = totalStudentsCount - mappedCount;
  const totalMentorsCount = scopedStaff.length;

  // Toggle Selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRegNumbers(filteredStudents.map((s) => s.studentProfile.registerNumber));
    } else {
      setSelectedRegNumbers([]);
    }
  };

  const handleToggleSelect = (regNum: string) => {
    setSelectedRegNumbers((prev) =>
      prev.includes(regNum) ? prev.filter((id) => id !== regNum) : [...prev, regNum]
    );
  };

  // Perform Bulk Mapping
  const handleApplyBulkMapping = async () => {
    if (selectedRegNumbers.length === 0) return;
    const effectiveStaffId = targetMentorStaffId || scopedStaff[0]?.id || staffList[0]?.id || 'STF001';
    const targetStaff = staffList.find((s) => s.id === effectiveStaffId) || scopedStaff[0] || staffList[0];
    const mentorName = targetStaff?.facultyName || 'Staff Mentor';

    const result = await bulkMapStudentsToMentor(selectedRegNumbers, effectiveStaffId, mentorName);
    setSelectedRegNumbers([]);
    showAllocationMessage(result.message, result.success ? 'success' : 'error');
  };

  // Perform Unmap
  const handleUnmapSelected = async () => {
    if (selectedRegNumbers.length === 0) return;
    const result = await bulkMapStudentsToMentor(selectedRegNumbers, '', 'Unassigned');
    setSelectedRegNumbers([]);
    showAllocationMessage(result.message, result.success ? 'success' : 'error');
  };

  // Handle CSV / Excel File Selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setUploadError('');
    setParsedPreviewStudents([]);

    const defaultStaff = scopedStaff[0] || staffList[0];
    const fileNameLower = file.name.toLowerCase();
    const shouldUseXlsxParser = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls') || fileNameLower.endsWith('.csv');

    if (shouldUseXlsxParser) {
      try {
        const parsed = await parseExcelStudentFile(file);
        if (parsed.length > 0) {
          const normalized = parsed
            .map((st) => {
              const mentorFaculty = st.studentProfile.mentorFaculty || defaultStaff?.facultyName || 'M. Kaviyarasu';
              const mentorStaffId = st.studentProfile.mentorStaffId || defaultStaff?.id || 'STF001';
              const department = st.studentProfile.department || fallbackDept;
              return normalizeStudentSkillBankRecord({
                ...st,
                studentProfile: {
                  ...st.studentProfile,
                  mentorFaculty,
                  mentorStaffId,
                  department,
                },
              });
            })
            .filter((st) => st.studentProfile?.registerNumber && st.studentProfile.studentName);

          if (normalized.length > 0) {
            setParsedPreviewStudents(normalized);
            return;
          }
          console.warn('Parsed file yielded no valid student rows. Falling back to plain text parser.');
        }
      } catch (parseError) {
        console.warn('Excel/CSV parser failed, falling back to plain text parser.', parseError);
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setUploadError('Uploaded file is empty.');
          return;
        }

        const lines = text.split(/\r\n|\n|\r/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length <= 1) {
          setUploadError('File contains no student data rows.');
          return;
        }

        const parsed: StudentSkillBankData[] = [];
        const hasHeader = lines[0].toLowerCase().includes('register') || lines[0].toLowerCase().includes('name');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        dataLines.forEach((line, idx) => {
          const cols = line.includes('\t') ? line.split('\t') : line.split(',');
          const cleanCols = cols.map((c) => c.replace(/^['\"]|['\"]$/g, '').trim());

          const rawRegNo = cleanCols[0];
          const rawName = cleanCols[1];
          // Skip blank rows — never fabricate fake random register numbers,
          // those used to get saved into the database under wrong IDs.
          if (!rawRegNo && !rawName) return;

          const regNo = rawRegNo || `STU_TBD_${idx + 1}`;
          const name = rawName || `Student ${idx + 1}`;
          const dept = cleanCols[2] || fallbackDept;
          const yearInput = cleanCols[3] || '2nd Year';
          const sec = cleanCols[4] || 'A';
          const email = cleanCols[5] || `${name.toLowerCase().replace(/\s+/g, '.')}@sasurie.ac.in`;
          const mobile = cleanCols[6] || '9876543210';

          const yearStr = yearInput.toLowerCase();
          const is1stCsv = yearStr.includes('1st') || yearStr === '1';
          const is2ndCsv = yearStr.includes('2nd') || yearStr === '2';
          const is3rdCsv = yearStr.includes('3rd') || yearStr === '3';
          const is4thCsv = yearStr.includes('4th') || yearStr === '4' || yearStr.includes('iv') || yearStr.includes('final');

          const csvBatch = is1stCsv ? '2025-2029' : is2ndCsv ? '2024-2028' : is3rdCsv ? '2023-2027' : is4thCsv ? '2022-2026' : '2024-2028';
          const csvSem = is1stCsv ? 'Sem I & II' : is2ndCsv ? 'Sem III & IV' : is3rdCsv ? 'Sem V & VI' : is4thCsv ? 'Sem VII & VIII' : 'Sem III & IV';
          const csvYr = is1stCsv ? '1st Year' : is2ndCsv ? '2nd Year' : is3rdCsv ? '3rd Year' : is4thCsv ? '4th Year' : yearInput;

          const fullStudent = normalizeStudentSkillBankRecord(
            createDefaultStudentSkillBankRecord({
              registerNumber: regNo,
              studentName: name,
              skillBankAccountNo: `SSB-2026-AIDS-${regNo.slice(-3)}`,
              degreeBranch: 'B.Tech. AI & DS',
              department: dept,
              batch: csvBatch,
              academicYear: csvYr,
              semester: csvSem,
              section: sec,
              admissionNumber: `ADM-${regNo.slice(-4)}`,
              studentMobile: mobile,
              studentEmail: email,
              personalEmail: email,
              mentorFaculty: defaultStaff?.facultyName || 'M. Kaviyarasu',
              mentorStaffId: defaultStaff?.id || 'STF001',
            })
          );

          parsed.push(stripSkillBankDates(fullStudent));
        });

        if (parsed.length === 0) {
          setUploadError('Uploaded file contains no valid student rows.');
          return;
        }

        setParsedPreviewStudents(parsed);
      } catch (err: any) {
        setUploadError('Failed to parse file: ' + err.message);
      }
    };

    reader.onerror = () => {
      setUploadError('Unable to read uploaded file.');
    };
    reader.readAsText(file);

  };

  // Save imported parsed students
  const handleConfirmImport = () => {
    if (parsedPreviewStudents.length === 0) return;
    const staff = staffList.find((s) => s.id === importMentorStaffId) || scopedStaff[0] || staffList[0];
    const mentorName = staff?.facultyName || 'Staff Mentor';

    const updatedWithMentor = parsedPreviewStudents.map((s) => {
      const existingMentor = s.studentProfile.mentorFaculty;
      const isDefaultMentor = !existingMentor || existingMentor.includes('M. Kaviyarasu') || existingMentor === 'Staff Mentor' || existingMentor === 'Unassigned';
      return {
        ...s,
        studentProfile: {
          ...s.studentProfile,
          mentorFaculty: isDefaultMentor ? mentorName : existingMentor,
          mentorStaffId: isDefaultMentor ? (staff?.id || importMentorStaffId) : s.studentProfile.mentorStaffId,
          department: s.studentProfile.department || fallbackDept,
        },
      };
    });

    importBulkSkillBankStudents(updatedWithMentor);
    showAllocationMessage(`Successfully saved ${updatedWithMentor.length} student records into database & mapped to mentor!`, 'success');
    setShowUploadModal(false);
    setParsedPreviewStudents([]);
    setUploadFileName('');
  };

  // Download CSV Sample Template
  const handleDownloadSampleCsv = () => {
    const headers = ['Register Number', 'Student Name', 'Department', 'Year', 'Section', 'Email', 'Mobile', 'Mentor Staff ID', 'Mentor Faculty Name'];
    const sampleRows = [
      ['732422104001', 'Aakash M', 'Artificial Intelligence & Data Science', '2nd Year', 'A', 'aakash.m@sasurie.ac.in', '9876543210', 'STF001', 'M. Kaviyarasu (Asst. Prof / III Year Mentor)'],
      ['732422104002', 'Ananya S', 'Artificial Intelligence & Data Science', '2nd Year', 'A', 'ananya.s@sasurie.ac.in', '9876543211', 'STF001', 'M. Kaviyarasu (Asst. Prof / III Year Mentor)'],
      ['732422104003', 'Bharath K', 'Artificial Intelligence & Data Science', '2nd Year', 'B', 'bharath.k@sasurie.ac.in', '9876543212', 'STF002', 'Prof. K. Deepa (Asst. Prof / AI & DS)'],
      ['732422104004', 'Dharshini R', 'Artificial Intelligence & Data Science', '3rd Year', 'A', 'dharshini.r@sasurie.ac.in', '9876543213', 'STF003', 'Dr. S. Tamilselvan (Asst. Prof / AI & DS)'],
    ];

    const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Mentor_Mentee_Student_Upload_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Single Manual Student
  const handleSaveManualStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.registerNumber.trim() || !manualForm.studentName.trim()) return;

    const staff = staffList.find((s) => s.id === manualForm.mentorStaffId);
    const mentorName = staff?.facultyName || 'M. Kaviyarasu';

    const yearVal = manualForm.year.toLowerCase();
    const is1stForm = yearVal.includes('1st') || yearVal === '1';
    const is2ndForm = yearVal.includes('2nd') || yearVal === '2';
    const is3rdForm = yearVal.includes('3rd') || yearVal === '3';
    const is4thForm = yearVal.includes('4th') || yearVal === '4' || yearVal.includes('iv') || yearVal.includes('final');

    const formBatch = is1stForm ? '2025-2029' : is2ndForm ? '2024-2028' : is3rdForm ? '2023-2027' : is4thForm ? '2022-2026' : '2024-2028';
    const formSem = is1stForm ? 'Sem I & II' : is2ndForm ? 'Sem III & IV' : is3rdForm ? 'Sem V & VI' : is4thForm ? 'Sem VII & VIII' : 'Sem III & IV';
    const formYr = is1stForm ? '1st Year' : is2ndForm ? '2nd Year' : is3rdForm ? '3rd Year' : is4thForm ? '4th Year' : manualForm.year;

    const fullStudent = createDefaultStudentSkillBankRecord({
      registerNumber: manualForm.registerNumber.trim(),
      studentName: manualForm.studentName.trim(),
      skillBankAccountNo: `SSB-2026-AIDS-${manualForm.registerNumber.slice(-3)}`,
      degreeBranch: 'B.Tech. AI & DS',
      department: manualForm.department,
      batch: formBatch,
      academicYear: formYr,
      semester: formSem,
      section: manualForm.section,
      admissionNumber: `ADM-${manualForm.registerNumber.slice(-4)}`,
      studentMobile: manualForm.mobile || '9876543210',
      studentEmail: manualForm.email || `${manualForm.studentName.toLowerCase().replace(/\s+/g, '.')}@sasurie.ac.in`,
      personalEmail: manualForm.email || `${manualForm.studentName.toLowerCase().replace(/\s+/g, '.')}@sasurie.ac.in`,
      mentorFaculty: mentorName,
      mentorStaffId: manualForm.mentorStaffId,
    });

    const newStudent = stripSkillBankDates(fullStudent);

    addSkillBankStudent(newStudent);
    setShowAddManualModal(false);
    setManualForm({
      registerNumber: '',
      studentName: '',
      year: '2nd Year',
      department: fallbackDept,
      section: 'A',
      email: '',
      mobile: '',
      mentorStaffId: scopedStaff[0]?.id || staffList[0]?.id || 'STF001',
    });
  };

  return (
    <div className="space-y-6">
      {/* Portal Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-black uppercase tracking-wider">
              HOD Access Only
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
              Department: {activeDeptName}
            </span>
            <span className="text-xs text-indigo-200 font-semibold">• Department Academic Governance</span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Mentor-Mentee Mapping System
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Upload student Excel lists, select target academic year (e.g., II YEAR {shortDeptCode}), and map students to department faculty mentors. Assigned mentees will be available in staff logins for Skill Bank & Attendance monitoring.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSyncAllToFirestore}
            disabled={dbSyncing}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              dbSyncedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60'
            }`}
            title="Store all mentor-mentee mapping tables in Firestore Database"
          >
            {dbSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
            ) : dbSyncedSuccess ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Database className="w-4 h-4 text-emerald-400" />
            )}
            <span>{dbSyncing ? 'Storing...' : dbSyncedSuccess ? 'Stored in DB!' : 'Store in DB'}</span>
          </button>

          <button
            onClick={handleDownloadSampleCsv}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-indigo-200 border border-indigo-700/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download Excel/CSV Template with columns"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Sample Excel</span>
          </button>

          {allocationMessage && (
            <div
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 animate-fade-in ${
                allocationMessageType === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
              }`}
            >
              {allocationMessageType === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>{allocationMessage}</span>
            </div>
          )}

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Student Excel</span>
          </button>

          <button
            onClick={() => setShowAddManualModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Single Student</span>
          </button>

          <button
            onClick={handleClearAllDeptMentees}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Clear all student and mentee data for fresh entries by HOD & Mentors"
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span>Clear All Mentees Data ({scopedStudents.length})</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Students</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">{totalStudentsCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">In Skill Bank Database</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Mapped Mentees</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {mappedCount}
            <span className="text-xs font-bold text-slate-400 ml-1.5">
              ({totalStudentsCount > 0 ? Math.round((mappedCount / totalStudentsCount) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Assigned to Faculty Mentors</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Unassigned Mentees</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2">{unassignedCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">Needs Mentor Allocation</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Faculty Mentors</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{totalMentorsCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">Available Department Staff</p>
        </div>
      </div>

      {/* Mentor - Mentee Allocation Database Summary Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                HOD Faculty Mentor &amp; Class Mapping Table
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Map mentors to specific Year &amp; Section (e.g. II Year Sec A) so assigned class students show up in mentor logins &amp; mentor hour attendance.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced to Firestore</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="p-2.5">Staff ID &amp; Faculty Name</th>
                <th className="p-2.5">Designation &amp; Dept</th>
                <th className="p-2.5 text-center">Assigned Mentees Count</th>
                <th className="p-2.5">Mapped Class (Year &amp; Section)</th>
                <th className="p-2.5 text-center">Quick Class Mapper (Year &amp; Sec)</th>
                <th className="p-2.5 text-right">Actions &amp; Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {scopedStaff.map((staff) => {
                const mentees = scopedStudents.filter(
                  (s) => s.studentProfile.mentorFaculty === staff.facultyName || s.studentProfile.mentorStaffId === staff.id
                );

                // Determine mapped class year and sections from assigned mentees
                const classMapSummary = React.useMemo(() => {
                  if (mentees.length === 0) return 'None Mapped';
                  const classesSet = new Set<string>();
                  mentees.forEach((m) => {
                    const yr = m.studentProfile.academicYear || 'Year ?';
                    const sec = m.studentProfile.section ? `Sec ${m.studentProfile.section}` : '';
                    classesSet.add(`${yr} ${sec}`.trim());
                  });
                  return Array.from(classesSet).join(', ');
                }, [mentees]);

                const selYear = rowMapYear[staff.id] || '2nd Year';
                const selSec = rowMapSec[staff.id] || 'A';

                return (
                  <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">{staff.facultyName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{staff.id}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">{staff.designation}</div>
                      <div className="text-[10px] text-slate-400">{staff.department}</div>
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                          mentees.length > 0
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {mentees.length} Mentees
                      </span>
                    </td>
                    <td className="p-2.5">
                      {mentees.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold text-[11px] inline-block w-fit">
                            Class: {classMapSummary}
                          </span>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {mentees.slice(0, 3).map((m) => m.studentProfile.studentName).join(', ')}
                            {mentees.length > 3 ? ` +${mentees.length - 3} more` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-slate-400 text-[10px]">No class mapped yet</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <select
                          value={selYear}
                          onChange={(e) => setRowMapYear({ ...rowMapYear, [staff.id]: e.target.value })}
                          className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                        </select>

                        <select
                          value={selSec}
                          onChange={(e) => setRowMapSec({ ...rowMapSec, [staff.id]: e.target.value })}
                          className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="A">Sec A</option>
                          <option value="B">Sec B</option>
                          <option value="C">Sec C</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleMapEntireClassToMentor(staff.id, selYear, selSec)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
                          title={`Map all ${selYear} Sec ${selSec} students to ${staff.facultyName}`}
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Map Class</span>
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedMentorFilter(staff.facultyName)}
                          className="px-2 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                          title="Filter table below for this mentor's mentees"
                        >
                          View ({mentees.length})
                        </button>

                        {mentees.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Unmap all ${mentees.length} mentees from mentor "${staff.facultyName}"?`)) {
                                  const regNumbers = mentees.map((m) => m.studentProfile.registerNumber);
                                  const result = await bulkMapStudentsToMentor(regNumbers, '', 'Unassigned');
                                  showAllocationMessage(result.message, result.success ? 'success' : 'error');
                                }
                              }}
                              className="px-2 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 dark:hover:bg-amber-900 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer flex items-center gap-1"
                              title="Unmap / Clear mentor mapping for all assigned mentees"
                            >
                              <X className="w-3 h-3 text-amber-600" />
                              <span>Unmap</span>
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to PERMANENTLY DELETE all ${mentees.length} mentee student records assigned to "${staff.facultyName}" from the database?`)) {
                                  const regNumbers = mentees.map((m) => m.studentProfile.registerNumber);
                                  await deleteSkillBankStudents(regNumbers);
                                  setSelectedRegNumbers((prev) => prev.filter((r) => !regNumbers.includes(r)));
                                }
                              }}
                              className="px-2 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                              title="DEL: Permanently delete all mentee student records under this mentor"
                            >
                              <Trash2 className="w-3 h-3 text-white" />
                              <span>DEL Data ({mentees.length})</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter & Batch Mapping Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full xl:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, reg no, mentor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Academic Year Selection */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
            <span className="text-xs text-slate-500 font-semibold shrink-0">Year:</span>
            {[
              { id: 'all', label: 'All Years' },
              { id: '1st Year', label: `I YEAR (${shortDeptCode})` },
              { id: '2nd Year', label: `II YEAR ${shortDeptCode}` },
              { id: '3rd Year', label: `III YEAR ${shortDeptCode}` },
              { id: '4th Year', label: `IV YEAR ${shortDeptCode}` },
            ].map((y) => (
              <button
                key={y.id}
                onClick={() => setSelectedYear(y.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedYear === y.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {y.label}
              </button>
            ))}
          </div>

          {/* Section Filter Selection */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
            <span className="text-xs text-slate-500 font-semibold shrink-0">Section:</span>
            {[
              { id: 'all', label: 'All Secs' },
              { id: 'A', label: 'Sec A' },
              { id: 'B', label: 'Sec B' },
              { id: 'C', label: 'Sec C' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSection(s.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSection === s.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Mentor Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold shrink-0">Filter Mentor:</span>
            <select
              value={selectedMentorFilter}
              onChange={(e) => setSelectedMentorFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Mentors</option>
              <option value="unassigned">⚠️ Unassigned Only</option>
              {scopedStaff.map((s) => (
                <option key={s.id} value={s.facultyName}>
                  {s.facultyName} ({s.designation})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Controls Bar (Active when students selected) */}
        {selectedRegNumbers.length > 0 ? (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 font-bold">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                {selectedRegNumbers.length} Student{selectedRegNumbers.length > 1 ? 's' : ''} Selected for Mentor Mapping
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={targetMentorStaffId}
                onChange={(e) => setTargetMentorStaffId(e.target.value)}
                className="flex-1 sm:w-64 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
              >
                {scopedStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    Assign to: {s.facultyName} ({s.designation})
                  </option>
                ))}
              </select>

              <button
                onClick={handleApplyBulkMapping}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
              >
                Map Selected Mentees
              </button>

              <button
                onClick={handleUnmapSelected}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 transition-all cursor-pointer shrink-0"
              >
                Unmap
              </button>

              <button
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to permanently delete ${selectedRegNumbers.length} selected student record(s) from the database?`)) {
                    await deleteSkillBankStudents(selectedRegNumbers);
                    setSelectedRegNumbers([]);
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-1"
                title="Delete selected student records from database"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Delete Selected ({selectedRegNumbers.length})</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
            <span>
              Showing {filteredStudents.length} of {totalStudentsCount} Students
            </span>
            <span>Check student boxes to perform bulk mentor mapping</span>
          </div>
        )}
      </div>

      {/* Student Mapping Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedRegNumbers.length === filteredStudents.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Student Info</th>
                <th className="p-3.5">Register & Roll No</th>
                <th className="p-3.5">Year & Section</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Assigned Faculty Mentor</th>
                <th className="p-3.5 text-center">Quick Change</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">No students match your criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload an Excel list or add students using the top buttons.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const prof = student.studentProfile;
                  const isSelected = selectedRegNumbers.includes(prof.registerNumber);
                  const isAssigned = prof.mentorFaculty && prof.mentorFaculty !== 'Unassigned' && prof.mentorFaculty !== '';

                  return (
                    <tr
                      key={prof.registerNumber}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(prof.registerNumber)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{prof.studentName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{prof.department || prof.degreeBranch}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {prof.registerNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{prof.skillBankAccountNo}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                          {prof.academicYear} - Sec {prof.section}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <div>{prof.studentEmail}</div>
                        <div className="text-[10px] text-slate-400">{prof.studentMobile}</div>
                      </td>

                      <td className="p-3.5">
                        {isAssigned ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{prof.mentorFaculty}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Unassigned</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <select
                          value={staffList.find((s) => s.facultyName === prof.mentorFaculty)?.id || ''}
                          onChange={async (e) => {
                            const newStaff = staffList.find((s) => s.id === e.target.value);
                            const result = await bulkMapStudentsToMentor(
                              [prof.registerNumber],
                              e.target.value,
                              newStaff?.facultyName || 'Unassigned'
                            );
                            showAllocationMessage(result.message, result.success ? 'success' : 'error');
                          }}
                          className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="">-- Assign Staff --</option>
                          {scopedStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.facultyName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAssigned && (
                            <button
                              onClick={async () => {
                                const result = await bulkMapStudentsToMentor([prof.registerNumber], '', 'Unassigned');
                                showAllocationMessage(result.message, result.success ? 'success' : 'error');
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
                              title="Unmap Mentor"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete student "${prof.studentName}" (${prof.registerNumber}) from the database?`)) {
                                await deleteSkillBankStudent(prof.registerNumber);
                                setSelectedRegNumbers((prev) => prev.filter((r) => r !== prof.registerNumber));
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete Student Record (HOD)"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------- EXCEL / CSV UPLOAD MODAL -------------------- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Upload Students Excel / CSV File
                  </h3>
                  <p className="text-xs text-slate-500">
                    Import student details batchwise and assign default mentor immediately.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setParsedPreviewStudents([]);
                  setUploadError('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Dropzone Box */}
              <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-6 text-center bg-indigo-50/30 dark:bg-indigo-950/10 space-y-3">
                <Upload className="w-10 h-10 text-indigo-500 mx-auto" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    Click to select CSV/Excel file or Drag & Drop here
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supported columns: Register Number, Student Name, Department, Year, Section, Email, Mobile. Optional: Mentor Staff ID, Mentor Faculty Name (from Mentor-Mentee mapping exports).
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Select File
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="px-3.5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Download Sample CSV
                  </button>
                </div>

                {uploadFileName && (
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Selected File: {uploadFileName}
                  </p>
                )}
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl font-semibold">
                  {uploadError}
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedPreviewStudents.length > 0 && (
                <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">
                      Parsed Preview: {parsedPreviewStudents.length} Students Ready to Import
                    </h4>

                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Assign Initial Mentor:</span>
                      <select
                        value={importMentorStaffId}
                        onChange={(e) => setImportMentorStaffId(e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white"
                      >
                        {scopedStaff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.facultyName} ({s.designation})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 sticky top-0">
                        <tr>
                          <th className="p-2">Reg No</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Year & Sec</th>
                          <th className="p-2">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {parsedPreviewStudents.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="p-2 font-mono font-bold">{s.studentProfile.registerNumber}</td>
                            <td className="p-2 font-semibold">{s.studentProfile.studentName}</td>
                            <td className="p-2">{s.studentProfile.academicYear} - Sec {s.studentProfile.section}</td>
                            <td className="p-2 text-slate-500">{s.studentProfile.studentEmail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
                    >
                      Save & Import {parsedPreviewStudents.length} Students
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- ADD SINGLE MANUAL STUDENT MODAL -------------------- */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Add Single Student & Assign Mentor
              </h3>
              <button
                onClick={() => setShowAddManualModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Register Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 732422104050"
                  value={manualForm.registerNumber}
                  onChange={(e) => setManualForm({ ...manualForm, registerNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vignesh K"
                  value={manualForm.studentName}
                  onChange={(e) => setManualForm({ ...manualForm, studentName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={manualForm.year}
                    onChange={(e) => setManualForm({ ...manualForm, year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    <option value="1st Year">1st Year (I YEAR {shortDeptCode})</option>
                    <option value="2nd Year">2nd Year (II YEAR {shortDeptCode})</option>
                    <option value="3rd Year">3rd Year (III YEAR {shortDeptCode})</option>
                    <option value="4th Year">4th Year (IV YEAR {shortDeptCode})</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    value={manualForm.section}
                    onChange={(e) => setManualForm({ ...manualForm, section: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Faculty Mentor
                </label>
                <select
                  value={manualForm.mentorStaffId}
                  onChange={(e) => setManualForm({ ...manualForm, mentorStaffId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                >
                  {scopedStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.facultyName} ({s.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Email
                </label>
                <input
                  type="email"
                  placeholder="student@sasurie.ac.in"
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddManualModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Student & Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
