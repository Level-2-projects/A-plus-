/**
 * js/config/student-nav.js – Single source of truth for student sidebar navigation.
 * Defines the navigation structure, order, URLs, icons, and dynamic badge slots.
 * Depends on: js/config/strings.js
 */

import { STRINGS } from "./strings.js";

/**
 * Array of navigation items for the student role in strict required order:
 * 1. Dashboard, 2. Courses, 3. Assignments, 4. Quizzes, 5. Attendance, 6. To-do, 7. Points, 8. Roadmaps, 9. Inbox.
 */
export const STUDENT_NAV_ITEMS = [
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
    hasBadge: false,
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
    id: "todo",
    label: STRINGS.nav.todo,
    href: "todo.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <polyline points="9 11 12 14 22 4"></polyline>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "points",
    label: STRINGS.nav.points,
    href: "points.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "roadmaps",
    label: STRINGS.nav.roadmaps,
    href: "roadmaps.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <circle cx="6" cy="19" r="3"></circle>
      <path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H5a3 3 0 0 1 0-6h11"></path>
      <polyline points="15 2 18 4 15 6"></polyline>
    </svg>`,
    hasBadge: false,
  },
  {
    id: "inbox",
    label: STRINGS.nav.inbox,
    href: "inbox.html",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-link-icon" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>`,
    hasBadge: true,
    badgeId: "nav-inbox-badge",
  },
];
