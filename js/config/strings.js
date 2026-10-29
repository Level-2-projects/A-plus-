/**
 * js/config/strings.js – Centralized dictionary for all user-facing UI text.
 * Keeps user-facing copy in one location for maintainability and future i18n / RTL translations.
 * Depends on: Nothing.
 */

export const STRINGS = {
  brand: {
    name: "A Plus",
    documentTitleSeparator: " · ",
    tagline: "Software Engineering College LMS",
    shortName: "A+",
    taglineLines: ["Small steps,", "big goals"],
  },

  roles: {
    student: "Student",
    doctor: "Doctor",
    department_admin: "Department Admin",
    super_admin: "Dean",
  },

  nav: {
    sectionLabel: "Menu",
    dashboard: "Dashboard",
    courses: "Courses",
    assignments: "Assignments",
    quizzes: "Quizzes",
    attendance: "Attendance",
    todo: "To-do",
    points: "Points",
    roadmaps: "Roadmaps",
    inbox: "Inbox",
  },

  pages: {
    profile: "Profile",
  },

  topbar: {
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    notifications: "Notifications",
    unreadCountBadge: (count) => `${count} unread`,
    viewAllMessages: "View all messages in Inbox →",
    noNotifications: "No new notifications",
    userMenuLabel: "User profile and options",
    profile: "Profile",
    logout: "Sign Out",
  },

  profile: {
    prefix: "Eng.",
  },

  inboxTypes: {
    warning: "Warning",
    notice: "Notice",
    suggestion: "AI Suggestion",
    system: "System Alert",
  },

  auth: {
    unauthorizedTitle: "Access Denied",
    unauthorizedMsg: "You must be signed in with a student account to view this page.",
    sessionExpired: "Your session has expired. Please log in again.",
  },
};
