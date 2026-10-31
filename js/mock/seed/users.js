/**
 * js/mock/seed/users.js – Seed user accounts for the A Plus mock database.
 *
 * IMPORTANT: This file is the single source of truth for all test credentials.
 * Passwords are stored in plain text intentionally – this is a developer mock only.
 * Never use this pattern in production.
 *
 * Account matrix:
 *  doctor@aplus.edu   / Doctor123   – Dr. Ahmed Mansour  (teaches Course A + B)
 *  doctor2@aplus.edu  / Doctor2!    – Dr. Sara Nabil     (teaches Course C)
 *  student@aplus.edu  / Student123  – Karim Adel         (enrolled in Course A)
 *  student2@aplus.edu / Student2!   – Nour Hassan        (enrolled in Course A, B)
 *  student3@aplus.edu / Student3!   – Yara Ibrahim       (enrolled in Course A, B, C)
 *  student4@aplus.edu / Student4!   – Omar Farouk        (enrolled in Course B, C)
 *  student5@aplus.edu / Student5!   – Laila Mostafa      (enrolled in Course C ONLY – isolation test)
 *  dept@aplus.edu     / Dept123     – Rania Hatem        (department admin)
 *  dean@aplus.edu     / Dean123     – Prof. Hassan Ali   (super admin / dean)
 *
 * Depends on: Nothing.
 */

export const SEED_USERS = [
  /* ── Doctors ── */
  {
    id: "usr-6",
    email: "doctor@aplus.edu",
    password: "Doctor123",
    full_name: "Ahmed Mansour",
    role: "doctor",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "DR2020001",
    disabled: false,
  },
  {
    id: "usr-7",
    email: "doctor2@aplus.edu",
    password: "Doctor2!",
    full_name: "Sara Nabil",
    role: "doctor",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "DR2020002",
    disabled: false,
  },

  /* ── Students ── */
  {
    id: "usr-1",
    email: "student@aplus.edu",
    password: "Student123",
    full_name: "Karim Adel",
    role: "student",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "CS2023001",
    disabled: false,
  },
  {
    id: "usr-2",
    email: "student2@aplus.edu",
    password: "Student2!",
    full_name: "Nour Hassan",
    role: "student",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "CS2023002",
    disabled: false,
  },
  {
    id: "usr-3",
    email: "student3@aplus.edu",
    password: "Student3!",
    full_name: "Yara Ibrahim",
    role: "student",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "CS2023003",
    disabled: false,
  },
  {
    id: "usr-4",
    email: "student4@aplus.edu",
    password: "Student4!",
    full_name: "Omar Farouk",
    role: "student",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "CS2023004",
    disabled: false,
  },
  {
    id: "usr-5",
    email: "student5@aplus.edu",
    password: "Student5!",
    full_name: "Laila Mostafa",
    role: "student",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "CS2023005",
    disabled: false,
  },

  /* ── Admin accounts ── */
  {
    id: "usr-8",
    email: "dept@aplus.edu",
    password: "Dept123",
    full_name: "Rania Hatem",
    role: "department_admin",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "ADM2010001",
    disabled: false,
  },
  {
    id: "usr-9",
    email: "dean@aplus.edu",
    password: "Dean123",
    full_name: "Hassan Ali",
    role: "super_admin",
    department_id: null,
    department_name: "Faculty of Computing & IT",
    university_id: "DEAN2000001",
    disabled: false,
  },
  {
    id: "usr-10",
    email: "disabled@aplus.edu",
    password: "Disabled123",
    full_name: "Disabled Student",
    role: "student",
    department_id: "dept-1",
    department_name: "Computer Science",
    university_id: "CS2023999",
    disabled: true,
  },
];
