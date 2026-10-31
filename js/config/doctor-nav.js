/**
 * js/config/doctor-nav.js – Single source of truth for Doctor sidebar navigation.
 * Defines the navigation structure, order, URLs, icons, and dynamic badge slots for the Doctor portal.
 * Depends on: js/config/strings.js
 */

import { STRINGS } from "./strings.js";

/**
 * Array of navigation items for the doctor role in strict required order:
 * 1. Dashboard, 2. Courses, 3. Assignments (with pending reviews badge), 4. Quizzes,
 * 5. Attendance, 6. Students (bonus points & attendance), 7. Messages (inbox alerts to students), 8. Ratings (anonymous feedback).
 */
export const DOCTOR_NAV_ITEMS = [
  {
    id: "dashboard",
    label: STRINGS.nav.dashboard,
    href: "dashboard.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9"></rect>
      <rect x="14" y="3" width="7" height="5"></rect>
      <rect x="14" y="12" width="7" height="9"></rect>
      <rect x="3" y="16" width="7" height="5"></rect>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "courses",
    label: STRINGS.nav.courses,
    href: "courses.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "assignments",
    label: STRINGS.nav.assignments,
    href: "assignments.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
      <path d="M9 12h6"></path>
      <path d="M9 16h6"></path>
    </svg>`,
    hasBadge: true,
    badgeId: "nav-doctor-assignments-badge",
  },
  {
    id: "quizzes",
    label: STRINGS.nav.quizzes,
    href: "quizzes.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "attendance",
    label: STRINGS.nav.attendance,
    href: "attendance.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
      <path d="M9 16l2 2 4-4"></path>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "students",
    label: STRINGS.nav.students,
    href: "students.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "messages",
    label: STRINGS.nav.messages,
    href: "messages.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      <line x1="8" y1="9" x2="16" y2="9"></line>
      <line x1="8" y1="13" x2="14" y2="13"></line>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "ratings",
    label: STRINGS.nav.ratings,
    href: "ratings.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,
    hasBadge: false,
  },
];
