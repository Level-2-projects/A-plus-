/**
 * js/core/layout.js – Shared application shell and layout renderer.
 * Assembles the responsive light sidebar, mobile drawer, topbar, notification bell,
 * user dropdown, and unread count polling.
 *
 * Depends on:
 *   - js/config.js (BRANDING)
 *   - js/config/strings.js
 *   - js/config/student-nav.js
 *   - js/api.js
 *   - js/api/student-api.js
 *   - js/core/auth-guard.js
 */

import { BRANDING } from "../config.js";
import { STRINGS } from "../config/strings.js";
import { STUDENT_NAV_ITEMS } from "../config/student-nav.js";
import { DOCTOR_NAV_ITEMS } from "../config/doctor-nav.js";
import { ADMIN_NAV_ITEMS } from "../config/admin-nav.js";
import { DEAN_NAV_ITEMS } from "../config/dean-nav.js";
import { getCurrentUser, logout } from "../api.js";
import { getUnreadCount, getInbox } from "../api/student-api.js";
import { getDoctorPendingSubmissionsCount, getDoctorUnreadCount, getDoctorInbox } from "../api/doctor-api.js";
import { getAdminUnreadCount, getAdminInbox } from "../api/admin-api.js";
import { getDeanUnreadCount, getDeanInbox } from "../api/dean-api.js";
import { requireAuth } from "./auth-guard.js";
import { listenForChanges } from "../mock/mock-db.js";

/**
 * Initializes and mounts the shared navigation shell.
 * Reusable across student, doctor, and admin roles by passing respective navItems and role configs.
 *
 * @param {object} options
 * @param {string} options.role - Active user role ('student', 'doctor', etc.).
 * @param {Array<object>} options.navItems - Array of navigation specifications.
 * @param {string} options.activePage - ID of the current page, including non-navigation pages.
 * @param {string} [options.pageTitle] - Explicit title for a page outside the navigation config.
 * @param {object} [options.user] - Logged in user entity.
 * @param {object} [options.branding=BRANDING] - Branding configuration.
 */
export function initLayout({ role = "student", navItems = [], activePage = "", pageTitle: explicitPageTitle = "", user = null, branding = BRANDING }) {
  const shellEl = document.getElementById("app-shell");
  const mainContentEl = document.getElementById("page-content");

  if (!shellEl) {
    console.error('[Layout] Fatal: Element <div id="app-shell"> was not found in the DOM.');
    return;
  }

  // Identify the active navigation metadata
  const currentNavItem = navItems.find((item) => item.id === activePage);
  if (!currentNavItem && !explicitPageTitle) {
    console.error(
      `[Layout] Unknown page id "${activePage}". Valid IDs for ${role} are: ${navItems.map((n) => n.id).join(", ")}`
    );
  }

  const pageTitle = currentNavItem ? currentNavItem.label : explicitPageTitle || branding.wordmark;
  const currentUser = user || getCurrentUser() || { full_name: "User", role };
  let profilePrefix = "";
  if (role === "student" && STRINGS.profile.studentPrefix) {
    profilePrefix = `${STRINGS.profile.studentPrefix} `;
  } else if (role === "doctor" && STRINGS.profile.doctorPrefix) {
    profilePrefix = `${STRINGS.profile.doctorPrefix} `;
  }
  // department_admin and super_admin display user's name only, without title prefix

  // 1. Render layout DOM scaffold
  shellEl.className = "app-shell";
  shellEl.innerHTML = `
    <!-- Mobile Drawer Backdrop Overlay -->
    <div id="sidebar-overlay" class="sidebar-overlay" aria-hidden="true"></div>

    <!-- App Sidebar (Light background preserves real logo colors) -->
    <aside id="app-sidebar" class="app-sidebar" aria-label="Main Navigation">
      <div class="sidebar-header">
        <a href="${navItems[0]?.href || '#'}" class="sidebar-brand-link">
          <img src="${branding.logoPath}" alt="${branding.logoAlt}" height="${branding.logoHeight}" class="sidebar-logo">
          <span class="sidebar-tagline">${STRINGS.brand.taglineLines.map((line) => `<span>${line}</span>`).join("<br>")}</span>
        </a>
        <button id="sidebar-close-btn" class="sidebar-close-btn" type="button" aria-label="${STRINGS.topbar.closeMenu}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section-label">${STRINGS.nav.sectionLabel}</div>
        <ul class="sidebar-list">
          ${navItems
            .map((item) => {
              const isActive = item.id === activePage;
              return `
              <li class="sidebar-item">
                <a href="${item.href}" class="sidebar-link" ${isActive ? 'aria-current="page"' : ""}>
                  ${item.icon || ""}
                  <span class="sidebar-link-label">${item.label}</span>
                  ${
                    item.hasBadge
                      ? `<span class="nav-badge" id="${item.badgeId || "nav-badge-" + item.id}" hidden>0</span>`
                      : ""
                  }
                </a>
              </li>
            `;
            })
            .join("")}
        </ul>
      </nav>

      <div class="sidebar-footer">
        <a href="profile.html" class="sidebar-profile-link" ${activePage === "profile" ? 'aria-current="page"' : ""}>
          <span class="sidebar-profile-name" title="${escapeHtml(currentUser.full_name)}">${profilePrefix}${escapeHtml(currentUser.full_name)}</span>
        </a>
      </div>
    </aside>

    <!-- Main Viewport and Header -->
    <div class="app-viewport">
      <header class="app-topbar">
        <div class="topbar-left">
          <button id="topbar-hamburger-btn" class="topbar-hamburger-btn" type="button" aria-label="${STRINGS.topbar.openMenu}" aria-expanded="false" aria-controls="app-sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 class="topbar-title">${pageTitle}</h1>
        </div>

        <div class="topbar-right">
          <!-- Notification Bell Menu -->
          <div class="menu-anchor">
            <button id="bell-btn" class="bell-btn" type="button" aria-label="${STRINGS.topbar.notifications}" aria-expanded="false" aria-controls="notif-dropdown">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span id="bell-dot" class="bell-dot" hidden aria-hidden="true"></span>
            </button>

            <div id="notif-dropdown" class="dropdown-panel notif-dropdown" hidden role="region" aria-label="${STRINGS.topbar.notifications}">
              <div class="notif-header">
                <h2 class="notif-header-title">${STRINGS.topbar.notifications}</h2>
                <span id="notif-count-badge" class="notif-header-badge" hidden>0 unread</span>
              </div>
              <ul id="notif-list" class="notif-list">
                <li class="notif-empty-state">${STRINGS.topbar.noNotifications}</li>
              </ul>
              <div class="notif-footer">
                <a href="${role === 'doctor' || role === 'department_admin' ? 'messages.html' : 'inbox.html'}" class="notif-footer-link">${role === 'doctor' || role === 'department_admin' ? STRINGS.topbar.viewAllDoctorMessages : STRINGS.topbar.viewAllMessages}</a>
              </div>
            </div>
          </div>

          <!-- User Menu Dropdown -->
          <div class="menu-anchor">
            <button id="user-menu-btn" class="user-menu-btn" type="button" aria-label="${STRINGS.topbar.userMenuLabel}" aria-expanded="false" aria-controls="user-dropdown">
              <div class="user-avatar" aria-hidden="true">
                ${getInitials(currentUser.full_name)}
              </div>
              <span class="user-name">${escapeHtml(currentUser.full_name)}</span>
              <svg class="user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <div id="user-dropdown" class="dropdown-panel user-dropdown" hidden role="menu">
              <div class="user-dropdown-header">
                <p class="user-dropdown-name">${escapeHtml(currentUser.full_name)}</p>
                <p class="user-dropdown-role">${STRINGS.roles[role] || role}</p>
              </div>
              <ul class="user-dropdown-menu">
                <li>
                  <a href="profile.html" class="user-dropdown-item" role="menuitem">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>${STRINGS.topbar.profile}</span>
                  </a>
                </li>
                <li class="user-dropdown-divider" role="separator"></li>
                <li>
                  <button id="logout-btn" class="user-dropdown-item logout-item" type="button" role="menuitem">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>${STRINGS.topbar.logout}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      <!-- Mount point for page-content -->
      <div id="content-slot"></div>
    </div>
  `;

  // Synchronize the visible h1 and browser title after mounting the topbar.
  setPageTitle(pageTitle);

  // Place #page-content inside the layout slot if present as sibling
  if (mainContentEl) {
    const slot = document.getElementById("content-slot");
    if (slot) {
      slot.replaceWith(mainContentEl);
      mainContentEl.classList.add("page-content");
      mainContentEl.innerHTML = ""; // Strictly clean and empty
    }
  }

  // 2. Attach UI Interactivity & Handlers
  attachSidebarHandlers();
  attachDropdownHandlers();
  attachLogoutHandler();

  // 3. Load Dynamic Data (Unread Count & Notifications)
  loadDynamicBadges(role);
  loadNotificationDropdown(role);

  // 4. Cross-tab synchronization: refresh badges & notifications when DB updates
  listenForChanges(() => {
    loadDynamicBadges(role);
    loadNotificationDropdown(role);
  });
}

/**
 * Updates the mounted page heading and browser title from one trusted text value.
 * This allows future dynamic views to keep their visible and browser titles synchronized.
 *
 * @param {string} text - The page title to display.
 * @returns {void}
 */
export function setPageTitle(text) {
  const pageTitle = String(text || BRANDING.wordmark).trim() || BRANDING.wordmark;
  const topbarTitleEl = document.querySelector(".topbar-title");

  // Update the sole document h1 only after the shared shell has mounted it.
  if (topbarTitleEl) {
    topbarTitleEl.textContent = pageTitle;
  }

  // Keep the browser tab meaningful for navigation and future detail pages.
  document.title = `${pageTitle}${STRINGS.brand.documentTitleSeparator}${BRANDING.wordmark}`;
}

/**
 * High-level initialization function for all student pages.
 * Enforces authentication and builds the shell layout without injecting any placeholder cards.
 *
 * @param {string} pageId - Navigation ID or supported student page ID.
 */
export function initStudentPage(pageId) {
  // Permit profile because it intentionally has no sidebar navigation item.
  const validIds = STUDENT_NAV_ITEMS.map((item) => item.id);
  const nonNavigationPages = { profile: STRINGS.pages.profile };
  if (!validIds.includes(pageId) && !nonNavigationPages[pageId]) {
    const errorMsg = `[A Plus Shell] Invalid student page ID: "${pageId}". Expected one of: [${validIds.join(", ")}]`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Guard route: redirect if not authenticated student
  const user = requireAuth({ allowedRoles: ["student"], redirectUrl: "../index.html" });
  if (!user) return; // Halt if redirect triggered

  // 2. Initialize layout with empty page-content
  initLayout({
    role: "student",
    navItems: STUDENT_NAV_ITEMS,
    activePage: pageId,
    pageTitle: nonNavigationPages[pageId] || "",
    user,
    branding: BRANDING,
  });
}

/**
 * High-level initialization function for all doctor pages.
 * Enforces doctor role authentication and builds the shell layout without injecting any placeholder cards.
 *
 * @param {string} pageId - Navigation ID or supported doctor page ID.
 */
export function initDoctorPage(pageId) {
  // Permit profile because it intentionally has no sidebar navigation item.
  const validIds = DOCTOR_NAV_ITEMS.map((item) => item.id);
  const nonNavigationPages = { profile: STRINGS.pages.profile };
  if (!validIds.includes(pageId) && !nonNavigationPages[pageId]) {
    const errorMsg = `[A Plus Shell] Invalid doctor page ID: "${pageId}". Expected one of: [${validIds.join(", ")}]`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Guard route: redirect if not authenticated doctor
  const user = requireAuth({ allowedRoles: ["doctor"], redirectUrl: "../index.html" });
  if (!user) return; // Halt if redirect triggered

  // 2. Initialize layout with empty page-content
  initLayout({
    role: "doctor",
    navItems: DOCTOR_NAV_ITEMS,
    activePage: pageId,
    pageTitle: nonNavigationPages[pageId] || "",
    user,
    branding: BRANDING,
  });
}

/**
 * High-level initialization function for all department admin pages.
 * Enforces department_admin role authentication and builds the shell layout.
 *
 * @param {string} pageId - Navigation ID or supported admin page ID.
 */
export function initAdminPage(pageId) {
  // Permit profile because it intentionally has no sidebar navigation item.
  const validIds = ADMIN_NAV_ITEMS.map((item) => item.id);
  const nonNavigationPages = { profile: STRINGS.pages.adminProfile || STRINGS.pages.profile };
  if (!validIds.includes(pageId) && !nonNavigationPages[pageId]) {
    const errorMsg = `[A Plus Shell] Invalid admin page ID: "${pageId}". Expected one of: [${validIds.join(", ")}]`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Guard route: redirect if not authenticated department_admin
  const user = requireAuth({ allowedRoles: ["department_admin"], redirectUrl: "../index.html" });
  if (!user) return; // Halt if redirect triggered

  // 2. Initialize layout with empty page-content
  initLayout({
    role: "department_admin",
    navItems: ADMIN_NAV_ITEMS,
    activePage: pageId,
    pageTitle: nonNavigationPages[pageId] || "",
    user,
    branding: BRANDING,
  });
}

/**
 * High-level initialization function for all dean (super_admin) pages.
 * Enforces super_admin role authentication and builds the shell layout.
 *
 * @param {string} pageId - Navigation ID or supported dean page ID.
 */
export function initDeanPage(pageId) {
  // Permit profile because it intentionally has no sidebar navigation item.
  const validIds = DEAN_NAV_ITEMS.map((item) => item.id);
  const nonNavigationPages = { profile: STRINGS.pages.deanProfile || STRINGS.pages.profile };
  if (!validIds.includes(pageId) && !nonNavigationPages[pageId]) {
    const errorMsg = `[A Plus Shell] Invalid dean page ID: "${pageId}". Expected one of: [${validIds.join(", ")}]`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Guard route: redirect if not authenticated super_admin
  const user = requireAuth({ allowedRoles: ["super_admin"], redirectUrl: "../index.html" });
  if (!user) return; // Halt if redirect triggered

  // 2. Initialize layout with empty page-content
  initLayout({
    role: "super_admin",
    navItems: DEAN_NAV_ITEMS,
    activePage: pageId,
    pageTitle: nonNavigationPages[pageId] || "",
    user,
    branding: BRANDING,
  });
}

/* ---------- Private Helper Functions ---------- */

/** Generates 2-letter uppercase initials from full name */
function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "AP";
}

/** Escapes special HTML characters to prevent XSS in text injection */
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Configures mobile drawer opening, closing, and keyboard trap */
function attachSidebarHandlers() {
  const hamburgerBtn = document.getElementById("topbar-hamburger-btn");
  const closeBtn = document.getElementById("sidebar-close-btn");
  const overlay = document.getElementById("sidebar-overlay");
  const sidebar = document.getElementById("app-sidebar");

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    hamburgerBtn?.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    hamburgerBtn?.setAttribute("aria-expanded", "false");
  }

  hamburgerBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  // Close drawer on navigation click
  sidebar?.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 900) {
        closeSidebar();
      }
    });
  });

  // Close drawer on Escape key press
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    }
  });
}

/** Configures notification and user dropdown open/close states */
function attachDropdownHandlers() {
  const bellBtn = document.getElementById("bell-btn");
  const notifDropdown = document.getElementById("notif-dropdown");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const userDropdown = document.getElementById("user-dropdown");

  function closeAllDropdowns() {
    if (notifDropdown) notifDropdown.hidden = true;
    if (userDropdown) userDropdown.hidden = true;
    bellBtn?.setAttribute("aria-expanded", "false");
    userMenuBtn?.setAttribute("aria-expanded", "false");
  }

  bellBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isClosed = notifDropdown.hidden;
    closeAllDropdowns();
    if (isClosed) {
      notifDropdown.hidden = false;
      bellBtn.setAttribute("aria-expanded", "true");
    }
  });

  userMenuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isClosed = userDropdown.hidden;
    closeAllDropdowns();
    if (isClosed) {
      userDropdown.hidden = false;
      userMenuBtn.setAttribute("aria-expanded", "true");
    }
  });

  // Close dropdowns on outside click
  document.addEventListener("click", (e) => {
    const isInside = e.target.closest("#notif-dropdown") || e.target.closest("#user-dropdown");
    if (!isInside) {
      closeAllDropdowns();
    }
  });

  // Close dropdowns on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllDropdowns();
    }
  });

}

/** Configures the logout trigger */
function attachLogoutHandler() {
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn?.addEventListener("click", () => {
    logout("../index.html");
  });
}

/** Loads dynamic sidebar badges and bell indicators depending on the active user role */
async function loadDynamicBadges(role = "student") {
  if (role === "doctor") {
    try {
      const [res, inbox] = await Promise.all([getDoctorPendingSubmissionsCount(), getDoctorUnreadCount()]);
      const count = res?.pending_count || 0;
      const unreadMessagesCount = inbox?.unread_count || 0;
      const assignmentsBadge = document.getElementById("nav-doctor-assignments-badge");
      if (assignmentsBadge) {
        assignmentsBadge.textContent = String(count);
        assignmentsBadge.hidden = count === 0;
      }
      const messagesBadge = document.getElementById("nav-doctor-messages-badge");
      if (messagesBadge) {
        messagesBadge.textContent = String(unreadMessagesCount);
        messagesBadge.hidden = unreadMessagesCount === 0;
      }
      const bellDot = document.getElementById("bell-dot");
      const notifHeaderBadge = document.getElementById("notif-count-badge");
      if (bellDot) {
        bellDot.hidden = unreadMessagesCount === 0;
      }
      if (notifHeaderBadge) {
        notifHeaderBadge.textContent = `${unreadMessagesCount} unread`;
        notifHeaderBadge.hidden = unreadMessagesCount === 0;
      }
    } catch (err) {
      console.warn("[Layout] Failed to load doctor badges:", err);
    }
    return;
  }

  if (role === "department_admin") {
    try {
      const res = await getAdminUnreadCount();
      const count = res?.unread_count || 0;
      const messagesBadge = document.getElementById("nav-admin-messages-badge");
      const bellDot = document.getElementById("bell-dot");
      const notifHeaderBadge = document.getElementById("notif-count-badge");
      if (messagesBadge) {
        messagesBadge.textContent = String(count);
        messagesBadge.hidden = count === 0;
      }
      if (bellDot) {
        bellDot.hidden = count === 0;
      }
      if (notifHeaderBadge) {
        notifHeaderBadge.textContent = `${count} unread`;
        notifHeaderBadge.hidden = count === 0;
      }
    } catch (err) {
      console.warn("[Layout] Failed to load admin unread messages count:", err);
    }
    return;
  }

  if (role === "super_admin") {
    try {
      const res = await getDeanUnreadCount();
      const count = res?.unread_count || 0;
      const inboxBadge = document.getElementById("nav-dean-inbox-badge");
      const bellDot = document.getElementById("bell-dot");
      const notifHeaderBadge = document.getElementById("notif-count-badge");
      if (inboxBadge) {
        inboxBadge.textContent = String(count);
        inboxBadge.hidden = count === 0;
      }
      if (bellDot) {
        bellDot.hidden = count === 0;
      }
      if (notifHeaderBadge) {
        notifHeaderBadge.textContent = `${count} unread`;
        notifHeaderBadge.hidden = count === 0;
      }
    } catch (err) {
      console.warn("[Layout] Failed to load dean unread inbox count:", err);
    }
    return;
  }

  // Student role: load unread inbox count
  try {
    const res = await getUnreadCount();
    const count = res?.unread_count || 0;

    const inboxBadge = document.getElementById("nav-inbox-badge");
    const bellDot = document.getElementById("bell-dot");
    const notifHeaderBadge = document.getElementById("notif-count-badge");

    if (inboxBadge) {
      inboxBadge.textContent = String(count);
      inboxBadge.hidden = count === 0;
    }

    if (bellDot) {
      bellDot.hidden = count === 0;
    }

    if (notifHeaderBadge) {
      notifHeaderBadge.textContent = `${count} unread`;
      notifHeaderBadge.hidden = count === 0;
    }
  } catch (err) {
    console.warn("[Layout] Failed to load unread inbox count:", err);
  }
}

/** Fetches latest notifications and renders inside the bell dropdown */
async function loadNotificationDropdown(role = "student") {
  try {
    let messages = [];
    if (role === "student") {
      messages = await getInbox();
    } else if (role === "doctor") {
      messages = await getDoctorInbox();
    } else if (role === "department_admin") {
      messages = await getAdminInbox();
    } else if (role === "super_admin") {
      messages = await getDeanInbox();
    }
    const listEl = document.getElementById("notif-list");
    if (!listEl) return;

    if (!Array.isArray(messages) || messages.length === 0) {
      listEl.innerHTML = `<li class="notif-empty-state">${STRINGS.topbar.noNotifications}</li>`;
      return;
    }

    // Display the latest five items, linking directly to the selected inbox message.
    const top5 = messages.slice(0, 5);

    // Map notification types to .status variants
    const typeStatusMap = {
      warning: "warning",
      notice: "info",
      suggestion: "info",
      system: "neutral",
    };

    listEl.replaceChildren();
    top5.forEach((msg) => {
      const item = document.createElement("li");
      item.className = `notif-item${msg.is_read ? "" : " is-unread"}`;
      const link = document.createElement("a");
      link.className = "notif-item-link";
      const targetPage = (role === "department_admin" || role === "doctor") ? "messages.html" : "inbox.html";
      link.href = `${targetPage}?id=${encodeURIComponent(msg.id)}`;
      const meta = document.createElement("div");
      meta.className = "notif-meta-row";
      const sender = document.createElement("span");
      sender.className = "notif-sender";
      sender.textContent = msg.sender_name || msg.sender || "System";
      const date = document.createElement("time");
      date.className = "notif-time";
      date.dateTime = msg.created_at;
      date.textContent = formatTime(msg.created_at);
      meta.append(sender, date);
      const subject = document.createElement("p");
      subject.className = "notif-subject";
      subject.textContent = msg.subject;
      const type = document.createElement("span");
      type.className = `status status-${typeStatusMap[msg.type] || "neutral"}`;
      type.textContent = STRINGS.inboxTypes[msg.type] || msg.type;
      link.append(meta, subject, type);
      item.append(link);
      listEl.append(item);
    });
  } catch (err) {
    console.warn("[Layout] Failed to populate notification bell messages:", err);
  }
}

/** Simple date-to-relative-time formatter */
function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
