/**
 * js/mock/student-mock-data.js – Realistic mock data store for student endpoints.
 * Simulated local state for courses, assignments, quizzes, attendance, todos, points, and inbox messages.
 * Depends on: Nothing.
 */

/** Mock courses for Software Engineering junior/senior semester */
export const INITIAL_MOCK_COURSES = [
  {
    id: "cs301",
    code: "SE301",
    title: "Software Architecture & Design Patterns",
    doctor: "Dr. Ahmed Mansour",
    department: "Software Engineering",
    credit_hours: 3,
    lectures_count: 24,
    completed_lectures: 14,
    schedule: "Sun, Tue 10:00 AM - 11:30 AM",
    room: "Hall 3B",
  },
  {
    id: "cs302",
    code: "SE302",
    title: "Relational Database Systems & SQL Tuning",
    doctor: "Dr. Sarah Nabil",
    department: "Software Engineering",
    credit_hours: 3,
    lectures_count: 24,
    completed_lectures: 12,
    schedule: "Mon, Wed 08:30 AM - 10:00 AM",
    room: "Lab 204",
  },
  {
    id: "cs303",
    code: "SE303",
    title: "Web Engineering & RESTful Services",
    doctor: "Dr. Omar Khaled",
    department: "Software Engineering",
    credit_hours: 3,
    lectures_count: 24,
    completed_lectures: 15,
    schedule: "Tue, Thu 01:00 PM - 02:30 PM",
    room: "Lab 101",
  },
  {
    id: "cs304",
    code: "SE304",
    title: "Operating Systems Internals & Concurrency",
    doctor: "Dr. Mahmoud Youssef",
    department: "Software Engineering",
    credit_hours: 4,
    lectures_count: 28,
    completed_lectures: 16,
    schedule: "Mon, Wed 12:00 PM - 01:45 PM",
    room: "Hall 1A",
  },
  {
    id: "cs305",
    code: "SE305",
    title: "Cloud Infrastructure & DevOps Automation",
    doctor: "Dr. Laila Mostafa",
    department: "Software Engineering",
    credit_hours: 3,
    lectures_count: 24,
    completed_lectures: 11,
    schedule: "Thu 09:00 AM - 12:00 PM",
    room: "Lab 305",
  },
];

/** Mock assignments with status and AI feedback */
export const INITIAL_MOCK_ASSIGNMENTS = [
  {
    id: "asg-01",
    course_id: "cs301",
    course_code: "SE301",
    title: "Microservices Decomposition & Event Bus Spec",
    due_date: "2026-10-30T23:59:00",
    status: "submitted",
    submitted_at: "2026-10-25T14:20:00",
    ai_feedback: "Clean separation of bounded contexts. Notice: retry policies should include exponential backoff.",
    final_grade: null, // Graded by doctor later
    max_grade: 20,
  },
  {
    id: "asg-02",
    course_id: "cs302",
    course_code: "SE302",
    title: "SQL Query Plan Analysis & Indexing Benchmark",
    due_date: "2026-11-04T23:59:00",
    status: "pending",
    submitted_at: null,
    ai_feedback: null,
    final_grade: null,
    max_grade: 15,
  },
  {
    id: "asg-03",
    course_id: "cs303",
    course_code: "SE303",
    title: "FastAPI JWT Auth Pipeline & Rate Limiter",
    due_date: "2026-10-22T23:59:00",
    status: "graded",
    submitted_at: "2026-10-21T18:10:00",
    ai_feedback: "Excellent token expiry handling. Security headers passed OWASP benchmark.",
    final_grade: 19,
    max_grade: 20,
  },
];

/** Mock quizzes */
export const INITIAL_MOCK_QUIZZES = [
  {
    id: "quiz-01",
    course_code: "SE301",
    title: "Design Patterns (Gang of Four) Mastery Quiz",
    duration_minutes: 25,
    questions_count: 15,
    status: "upcoming",
    available_from: "2026-10-28T10:00:00",
    available_to: "2026-10-28T22:00:00",
    score: null,
    total_score: 15,
  },
  {
    id: "quiz-02",
    course_code: "SE304",
    title: "Process Scheduling & Deadlock Prevention",
    duration_minutes: 20,
    questions_count: 12,
    status: "completed",
    available_from: "2026-10-18T10:00:00",
    available_to: "2026-10-18T22:00:00",
    score: 11,
    total_score: 12,
  },
];

/** Mock attendance tracking with course-level warning indicators */
export const INITIAL_MOCK_ATTENDANCE = {
  overall_percentage: 91.2,
  total_lectures: 68,
  attended_lectures: 62,
  absence_count: 6,
  grade_penalty_risk: false,
  warning_threshold: 4, // Absences per course that trigger penalty notice
  courses: [
    {
      course_id: "cs301",
      course_code: "SE301",
      course_title: "Software Architecture & Design Patterns",
      total_sessions: 14,
      attended: 14,
      absences: 0,
      percentage: 100,
      penalty_status: "normal",
    },
    {
      course_id: "cs302",
      course_code: "SE302",
      course_title: "Relational Database Systems & SQL Tuning",
      total_sessions: 12,
      attended: 10,
      absences: 2,
      percentage: 83.3,
      penalty_status: "notice",
    },
    {
      course_id: "cs303",
      course_code: "SE303",
      course_title: "Web Engineering & RESTful Services",
      total_sessions: 15,
      attended: 14,
      absences: 1,
      percentage: 93.3,
      penalty_status: "normal",
    },
    {
      course_id: "cs304",
      course_code: "SE304",
      course_title: "Operating Systems Internals & Concurrency",
      total_sessions: 16,
      attended: 13,
      absences: 3,
      percentage: 81.25,
      penalty_status: "warning",
    },
    {
      course_id: "cs305",
      course_code: "SE305",
      course_title: "Cloud Infrastructure & DevOps Automation",
      total_sessions: 11,
      attended: 11,
      absences: 0,
      percentage: 100,
      penalty_status: "normal",
    },
  ],
};

/** Mock to-do list items */
export const INITIAL_MOCK_TODOS = [
  {
    id: "td-1",
    title: "Review SOLID patterns lecture recording",
    course_code: "SE301",
    due_date: "2026-10-27",
    priority: "high",
    completed: false,
    created_at: "2026-10-24T09:00:00",
  },
  {
    id: "td-2",
    title: "Draft B-Tree index visualization diagram",
    course_code: "SE302",
    due_date: "2026-10-29",
    priority: "medium",
    completed: false,
    created_at: "2026-10-24T11:30:00",
  },
  {
    id: "td-3",
    title: "Set up Docker compose file for Web Lab 4",
    course_code: "SE303",
    due_date: "2026-10-25",
    priority: "low",
    completed: true,
    created_at: "2026-10-22T14:00:00",
  },
  {
    id: "td-4",
    title: "Practice Semaphore synchronization problems",
    course_code: "SE304",
    due_date: "2026-11-01",
    priority: "high",
    completed: false,
    created_at: "2026-10-25T16:00:00",
  },
];

/** Mock monthly points and leaderboard */
export const INITIAL_MOCK_POINTS = {
  current_points: 1420,
  department_rank: 2,
  department_name: "Software Engineering",
  current_month: "October 2026",
  points_reset_date: "2026-11-01T00:00:00",
  monthly_top_3: [
    { rank: 1, name: "Yara Ibrahim", points: 1560, initials: "YI", department: "Software Engineering" },
    { rank: 2, name: "Test Student", points: 1420, initials: "TS", department: "Software Engineering", is_current_user: true },
    { rank: 3, name: "Karim Hassan", points: 1390, initials: "KH", department: "Software Engineering" },
  ],
  breakdown: [
    { source: "Assignment early submissions", points: 400 },
    { source: "Perfect lecture attendance streak", points: 320 },
    { source: "High quiz performance (>90%)", points: 500 },
    { source: "Peer code review contributions", points: 200 },
  ],
};

/** Mock inbox messages complying with the strict shape requirements */
export const INITIAL_MOCK_INBOX = [
  {
    id: "msg-101",
    type: "warning",
    sender: "Attendance Monitor",
    subject: "Absence Notice: SE304 Operating Systems (3 Absences)",
    body: "You have accumulated 3 absences in SE304. Reaching 4 absences will trigger a 5% grade penalty per university policy. Please consult Dr. Mahmoud Youssef if you have medical excuses.",
    created_at: "2026-10-25T08:30:00Z",
    is_read: false,
  },
  {
    id: "msg-102",
    type: "notice",
    sender: "Dr. Ahmed Mansour",
    subject: "Office Hours Rescheduled for Tomorrow",
    body: "Please note that tomorrow's office hours for SE301 are shifted from 11:30 AM to 02:00 PM in Faculty Office 412.",
    created_at: "2026-10-24T16:15:00Z",
    is_read: false,
  },
  {
    id: "msg-103",
    type: "suggestion",
    sender: "A+ Learning Assistant",
    subject: "AI Suggestion for Assignment 1 Submission",
    body: "Your submitted code for Assignment 1 is strong on architecture, but we noticed 2 unhandled Promise rejections in edge cases. Review the feedback tab before the doctor locks the final grade.",
    created_at: "2026-10-23T19:40:00Z",
    is_read: false,
  },
  {
    id: "msg-104",
    type: "system",
    sender: "A+ Academic Portal",
    subject: "Midterm Exam Schedule Draft Published",
    body: "The college administration has published the tentative exam schedule for Fall 2026. Please verify no course conflicts exist before Friday.",
    created_at: "2026-10-22T10:00:00Z",
    is_read: true,
  },
  {
    id: "msg-105",
    type: "notice",
    sender: "Dr. Sarah Nabil",
    subject: "SE302 Practice Lab Queries Available",
    body: "Bonus sample queries for the upcoming query optimization quiz have been uploaded to the course resources folder.",
    created_at: "2026-10-20T11:20:00Z",
    is_read: true,
  },
  {
    id: "msg-106",
    type: "system",
    sender: "A+ Reward System",
    subject: "Congratulations! You reached Top 3 in October",
    body: "Great effort this month! You are currently ranked #2 in the Software Engineering Department leaderboard with 1,420 points.",
    created_at: "2026-10-18T14:00:00Z",
    is_read: true,
  },
];

/**
 * Mock roadmaps (PROVISIONAL - schema subject to upcoming revision)
 */
export const INITIAL_MOCK_ROADMAPS = [
  {
    id: "roadmap-fe",
    title: "Frontend Engineering Track",
    description: "Core milestone competencies for modern web client development.",
    progress_percent: 35,
    steps: [
      { id: "step-fe-1", title: "HTML5 Semantic Structure & Web Accessibility", status: "done" },
      { id: "step-fe-2", title: "CSS Design Systems, Grid & Logical Properties", status: "current" },
      { id: "step-fe-3", title: "Vanilla JavaScript ES Modules & Fetch Pipeline", status: "locked" },
      { id: "step-fe-4", title: "Stateful Application Shell & Route Guards", status: "locked" },
    ],
  },
  {
    id: "roadmap-be",
    title: "Backend API & Architecture Track",
    description: "System design, relational data modeling, and FastAPI backend engineering.",
    progress_percent: 60,
    steps: [
      { id: "step-be-1", title: "Relational Modeling & Schema Design", status: "done" },
      { id: "step-be-2", title: "FastAPI REST Architecture & Token Auth", status: "done" },
      { id: "step-be-3", title: "Database Indexing & Query Plan Tuning", status: "current" },
      { id: "step-be-4", title: "Cloud Deployment & Docker Containerization", status: "locked" },
    ],
  },
];

/** Provisional profile record returned by the student profile endpoint. */
export const INITIAL_MOCK_PROFILE = {
  id: "student-01",
  full_name: "Test Student",
  email: "test.student@aplus.edu",
  university_id: "20230001",
  department: "Software Engineering",
  level: "Level 3",
};

/* ---------- Stateful In-Memory Collections for Mutations ---------- */

let coursesState = JSON.parse(JSON.stringify(INITIAL_MOCK_COURSES));
let assignmentsState = JSON.parse(JSON.stringify(INITIAL_MOCK_ASSIGNMENTS));
let quizzesState = JSON.parse(JSON.stringify(INITIAL_MOCK_QUIZZES));
let attendanceState = JSON.parse(JSON.stringify(INITIAL_MOCK_ATTENDANCE));
let todosState = JSON.parse(JSON.stringify(INITIAL_MOCK_TODOS));
let pointsState = JSON.parse(JSON.stringify(INITIAL_MOCK_POINTS));
let inboxState = JSON.parse(JSON.stringify(INITIAL_MOCK_INBOX));
let roadmapsState = JSON.parse(JSON.stringify(INITIAL_MOCK_ROADMAPS));
let profileState = JSON.parse(JSON.stringify(INITIAL_MOCK_PROFILE));

/**
 * Accessors and state mutations for Mock API simulations.
 */
export const mockDataStore = {
  getCourses: () => [...coursesState],
  getCourse: (id) => coursesState.find((c) => c.id === id || c.code.toLowerCase() === id.toLowerCase()) || null,
  getAssignments: () => [...assignmentsState],
  getQuizzes: () => [...quizzesState],
  getAttendance: () => ({ ...attendanceState }),
  getTodos: () => [...todosState],
  addTodo: (newTodo) => {
    const item = {
      id: `td-${Date.now()}`,
      completed: false,
      created_at: new Date().toISOString(),
      ...newTodo,
    };
    todosState.unshift(item);
    return item;
  },
  updateTodo: (id, updates) => {
    const index = todosState.findIndex((t) => t.id === id);
    if (index === -1) return null;
    todosState[index] = { ...todosState[index], ...updates };
    return todosState[index];
  },
  deleteTodo: (id) => {
    const index = todosState.findIndex((t) => t.id === id);
    if (index === -1) return false;
    todosState.splice(index, 1);
    return true;
  },
  getPoints: () => ({ ...pointsState }),
  getRoadmaps: () => [...roadmapsState],
  getProfile: () => ({ ...profileState }),
  getInbox: () => [...inboxState],
  markMessageRead: (id) => {
    const message = inboxState.find((m) => m.id === id);
    if (message) {
      message.is_read = true;
      return true;
    }
    return false;
  },
  getUnreadCount: () => inboxState.filter((m) => !m.is_read).length,
  getDashboardSummary: () => ({
    enrolled_courses: coursesState.length,
    pending_assignments: assignmentsState.filter((a) => a.status === "pending").length,
    upcoming_quizzes: quizzesState.filter((q) => q.status === "upcoming").length,
    attendance_rate: attendanceState.overall_percentage,
    points: pointsState.current_points,
    rank: pointsState.department_rank,
    unread_messages: inboxState.filter((m) => !m.is_read).length,
  }),
};
