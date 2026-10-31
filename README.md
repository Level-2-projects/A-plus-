# A Plus (A+) – Student & Doctor LMS Demo

Welcome to **A Plus** (A+), a modern web-based college Learning Management System (LMS) engineered for the Software Engineering Department.

This repository contains the complete **Student and Doctor Area Shells** built in pure standards-compliant HTML, CSS, and vanilla JavaScript (ES modules) with **zero external libraries or build tools**.

---

## 1. Directory & File Structure

```
A plussss/
├── index.html                   # Sign-in portal entry page
├── login.css                    # Login page styling (imports css/tokens.css)
├── login.js                     # Login page UI controller
├── config.js                    # Root re-export of js/config.js
├── api.js                       # Root re-export of js/api.js
├── logo_clean.png               # Official transparent brand logo (44px height in header)
├── campus_final.jpg             # Campus hero background for sign-in
│
├── css/
│   ├── tokens.css               # Single source of truth: Google Fonts, brand colors, motion tokens, type scale
│   ├── motion.css               # Motion system: page enter, .stagger cascade, card lift physics, reduced-motion
│   ├── base.css                 # Global CSS reset, Plus Jakarta Sans headings, Inter body, tabular numerals
│   ├── layout.css               # Responsive app shell (light sidebar, 44px nav items, solid active nav)
│   └── components.css           # Components: .card, .card--hero, .card--interactive, .btn, .status, .medal, .progress-bar, .progress-ring, .skeleton
│
├── js/
│   ├── config.js                # Core configuration (API_BASE_URL, USE_MOCK, STORAGE_KEYS, ROLE_ROUTES, BRANDING, ROLE_NAV)
│   ├── api.js                   # Authentication & session storage helpers (the only file touching Web Storage)
│   ├── config/
│   │   ├── strings.js           # Central dictionary for all UI text (i18n & RTL friendly, section labels)
│   │   ├── student-nav.js       # Single source of truth for student sidebar items and SVG icons (9 items)
│   │   └── doctor-nav.js        # Single source of truth for doctor sidebar items and SVG icons (8 items)
│   ├── core/
│   │   ├── auth-guard.js        # Route protection: checks token + allowed role before rendering
│   │   ├── http.js              # Fetch wrapper: injects Bearer token, maps ApiError, triggers 401 logout
│   │   ├── layout.js            # Shared shell builder (initLayout, initStudentPage, initDoctorPage), mobile drawer, menus
│   │   └── count-up.js          # Numerical count-up engine with requestAnimationFrame & IntersectionObserver
│   ├── components/
│   │   └── progress-ring.js     # Factory for accessible animated SVG progress rings
│   ├── api/
│   │   ├── student-api.js       # Student API client (switches mock/live) with JSDoc
│   │   └── doctor-api.js        # Doctor API client (switches mock/live) with JSDoc
│   ├── mock/
│   │   ├── mock-db.js           # Shared localStorage mock database with cross-tab broadcast
│   │   ├── mock-server.js       # In-browser router enforcing 401/403/404/409/422 and scope
│   │   └── seed/                # Modular seed data files (users, courses, enrollments, etc.)
│   │       ├── users.js
│   │       ├── departments.js
│   │       ├── courses.js
│   │       ├── enrollments.js
│   │       ├── lectures.js
│   │       ├── assignments.js
│   │       ├── submissions.js
│   │       ├── quizzes.js
│   │       ├── quiz-attempts.js
│   │       ├── attendance.js
│   │       ├── messages.js
│   │       ├── points-ledger.js
│   │       ├── ratings.js
│   │       └── todos.js
│   ├── student/                 # Student page entry scripts (one small script per view)
│   │   ├── dashboard.js
│   │   ├── courses.js
│   │   ├── assignments.js
│   │   ├── quizzes.js
│   │   ├── attendance.js
│   │   ├── todo.js
│   │   ├── points.js
│   │   ├── roadmaps.js
│   │   ├── inbox.js
│   │   └── profile.js
│   └── doctor/                  # Doctor page entry scripts (one small script per view)
│       ├── dashboard.js
│       ├── courses.js
│       ├── assignments.js
│       ├── quizzes.js
│       ├── attendance.js
│       ├── students.js
│       ├── messages.js
│       ├── ratings.js
│       └── profile.js
│
├── student/                     # Student dashboards and working page views
│   ├── dashboard.html
│   ├── courses.html
│   ├── course.html              # Course detail (?id=...)
│   ├── assignments.html
│   ├── assignment.html          # Assignment detail (?id=...)
│   ├── quizzes.html
│   ├── quiz.html                # Quiz detail/results (?id=...)
│   ├── attendance.html
│   ├── todo.html
│   ├── points.html
│   ├── roadmaps.html
│   ├── inbox.html
│   └── profile.html
│
├── doctor/                      # Doctor dashboards and working page views
│   ├── dashboard.html
│   ├── courses.html
│   ├── course.html              # Course detail (?id=...)
│   ├── assignments.html
│   ├── assignment.html          # Assignment submissions/grading (?id=...)
│   ├── quizzes.html
│   ├── quiz.html                # Quiz editing/results (?id=...)
│   ├── attendance.html
│   ├── students.html
│   ├── messages.html
│   ├── ratings.html
│   └── profile.html
│
├── dev/
│   ├── style-guide.html         # Internal developer style guide showcasing all tokens, components, and motion
│   ├── test-runner.html         # In-browser mock scenario runner
│   ├── mock-playground.html     # Interactive API and database playground
│   ├── node-test-runner.mjs     # Node scenario runner
│   └── node-test-shim.js        # Development-only storage/event shim
│
└── docs/
    ├── api-contract.md          # REST API specifications and complete route inventory
    ├── data-model.md            # Relational schema and business constraints
    ├── manual-test-guide.md     # Login, workflows, and cross-tab badge validation
    └── PROGRESS.md              # Stage/scenario handoff status
```

---

## 2. Design System & Global Rules

All styling tokens are declared in `css/tokens.css` as CSS Custom Properties, making it the single source of truth across the login page and all authenticated role portals.

### 2.1 GLOBAL RULE: No Tinted or Translucent Boxes
> **Strict Design Rule:** Never use boxes with a soft or translucent colored background (chips, pills, soft badges, tinted tags) anywhere in the platform.
> - **Sidebar footer:** A single `Eng. <session name>` profile link, with no background, secondary line, hover state, or pill.
> - **User menu:** Plain button showing avatar, name, and chevron with no border or pill outline; subtle background only on hover/focus.
> - **Status indicators:** Use the `.status` component (an 8px solid colored dot followed by plain text), never a soft badge box.
> - **Count badges:** Small SOLID gold circles with dark text (like the Inbox unread badge) are the only filled badges permitted.
> - **Interaction exception:** Hover and focus backgrounds are interaction states, not static label boxes, so they are exempt from this rule.

### 2.2 Brand Palette & Depth Anchors
- **Page Background (`--bg`)**: `#EDF2F8` (provides depth so white cards stand out).
- **Surfaces (`--surface`)**: `#FFFFFF` (pure white for cards, sidebar, topbar, inputs).
- **Border (`--border`)**: `#DCE4EE` (crisp 1px boundary).
- **University Blue (`--primary`)**: `#1F4B7F` (buttons, solid active nav items, links).
- **Deep Navy (`--navy-900`)**: `#0F2A4D` (headings, brand wordmark, strong text).
- **Medium Blue (`--secondary`)**: `#2F80C4` (interactive focus rings, hover borders).
- **Interaction hover rules:** Only inactive sidebar navigation uses soft blue (`--nav-hover-bg`); solid buttons use `--btn-primary-hover`, matching Sign in; all other controls use subtle `--control-hover-bg`. Hover never adds an underline or changes a control's text/icon color.
- **Lake Aqua (`--aqua`)**: `#27A7C4` (progress meters, rings, and charts).
- **Accent Gold (`--gold`)**: `#D4A72C` (used **strictly** for unread count badges and points).
- **Status Green (`--success`)**: `#2E9E5B` (strictly reserved for success states, never branding).
- **Medal Tokens**: `--medal-gold: #D4A72C`, `--medal-silver: #A8B3C2`, `--medal-bronze: #B87333`.

### 2.3 Typography & One-Place Font Loading
Google Fonts are loaded in **ONE shared place** at the top of `css/tokens.css`:
```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Source+Serif+4:wght@600;700&display=swap");
```
To change or substitute fonts across the entire application, **edit only `css/tokens.css`**.

#### Font Stacks
- **Headings & Stat Numbers (`--font-heading`)**: `"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;` (weights `700`–`800`).
- **Body & UI Controls (`--font-body`)**: `Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;` (weights `400`–`700`).
- **Brand Wordmark (`--font-brand`)**: `Montserrat, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;` (strictly weight `700` for wordmark and login hero).
- **Topbar Title (`--font-title`)**: `"Source Serif 4", Georgia, "Times New Roman", serif;` (weight `700`, for the authenticated topbar title only). Content headings and numbers remain `--font-heading`; text, sidebar items, and controls remain `--font-body`.

#### Dynamic Page Titles
`setPageTitle(text)` from `js/core/layout.js` updates the mounted topbar `<h1>` and browser title together. It is called automatically for every shell page and can be used by dynamic detail pages:
```javascript
import { setPageTitle } from "../core/layout.js";

setPageTitle("Software Architecture");
```

#### Type Scale Tokens with Matching Line Heights
- `--font-size-12: 12px` / `--line-height-12: 16px` (captions, chips, tags)
- `--font-size-14: 14px` / `--line-height-14: 20px` (nav items, body copy, inputs, buttons)
- `--font-size-16: 16px` / `--line-height-16: 24px` (sub-headings, card titles)
- `--font-size-20: 20px` / `--line-height-20: 28px` (topbar page title, section headers)
- `--font-size-24: 24px` / `--line-height-24: 32px` (h2 titles)
- `--font-size-32: 32px` / `--line-height-32: 40px` (main h1 headings, big stats)
- `--font-size-40: 40px` / `--line-height-40: 48px` (display figures)

### 2.4 Motion System (`css/motion.css`)
- **Duration tokens**: `--duration-fast: 120ms`, `--duration-base: 200ms`, `--duration-slow: 400ms`.
- **Timing curve**: `--ease-out: cubic-bezier(0.22, 0.61, 0.36, 1)`.
- **Page Enter**: `#page-content` automatically fades in and rises 8px over 200ms on load.
- **Button Feedback**: Subtle scale press feedback (`transform: scale(0.98)` on `:active`).
- **Accessibility**: Under `@media (prefers-reduced-motion: reduce)`, all transitions and animations are turned off and final states are shown immediately.

---

## 3. Reusable UI Components & Usage Guide

### 3.1 Cards & Interactive Physics
```html
<!-- Standard static card -->
<div class="card">
  <h3>Card Title</h3>
  <p>Static content container.</p>
</div>

<!-- Interactive card with hover lift (2px lift + elevated shadow) -->
<div class="card card--interactive">
  <h3>Interactive Module</h3>
  <p>Hover to feel the elevation; click down to return to rest.</p>
</div>

<!-- Hero Card (Navy-to-blue gradient banner) -->
<div class="card--hero">
  <h2>Welcome to Software Engineering</h2>
  <p>Your academic progress and daily sprint objectives.</p>
</div>
```

### 3.2 Numerical Count-Up (`js/core/count-up.js`)
Animates from 0 to target value once the element scrolls into view via `IntersectionObserver`.
```html
<span class="stat-number" data-count-up="1420" data-count-suffix=" pts">0</span>
<span class="stat-number" data-count-up="91.2" data-count-decimals="1" data-count-suffix="%">0</span>
```
```javascript
import { initCountUp } from "./js/core/count-up.js";

// Initialize on page load (runs once per element, immediate on reduced-motion)
initCountUp(document);
```

### 3.3 Progress Indicators (Bars & Rings)
#### Progress Bar
```html
<div class="progress-bar">
  <!-- Default aqua fill -->
  <div class="progress-bar-fill" style="inline-size: 75%;"></div>
</div>
<!-- Variants: .progress-bar-fill--primary, .progress-bar-fill--success, .progress-bar-fill--warning -->
```

#### Progress Ring Factory (`js/components/progress-ring.js`)
```javascript
import { createProgressRing } from "./js/components/progress-ring.js";

const ring = createProgressRing({
  value: 85,
  size: 64,
  strokeWidth: 6,
  label: "Course Progress",
  variant: "aqua" // 'aqua' | 'primary' | 'success' | 'warning'
});
document.getElementById("metrics-container").appendChild(ring);
```

### 3.4 Status Dots (No Pill Boxes)
```html
<span class="status status-success">Passed / Attended</span>
<span class="status status-warning">Absence Warning</span>
<span class="status status-danger">Penalty Risk</span>
<span class="status status-info">Submission Open</span>
<span class="status status-neutral">Archived</span>
```

### 3.5 Medals (Gamification Leaderboard)
```html
<span class="medal medal--gold">1</span>
<span class="medal medal--silver">2</span>
<span class="medal medal--bronze">3</span>
<span class="medal medal--gold medal--lg">1</span>
```

### 3.6 Stagger Cascade
```html
<div class="stagger" style="--i: 0;">Cascade Item 1</div>
<div class="stagger" style="--i: 1;">Cascade Item 2</div>
<div class="stagger" style="--i: 2;">Cascade Item 3</div>
```

### 3.7 Buttons & Inputs
```html
<button class="btn btn-primary" type="button">Primary Action</button>
<button class="btn btn-secondary" type="button">Secondary Action</button>
<button class="btn btn-ghost" type="button">Ghost Action</button>
<input class="input" type="text" placeholder="Standard input">
```

---

## 4. Developer Tools (Sandbox & Testing)

Developer utilities reside in `dev/` and are not linked in the main student or doctor navigation:

1. **Test Runner (`dev/test-runner.html`):** In-browser test framework running automated scenarios against the shared mock database and mock server.
2. **Mock Playground (`dev/mock-playground.html`):** Interactive API sandbox to test endpoints as any seeded user, view responses, inspect localStorage snapshots, and reset state.
3. **Style Guide (`dev/style-guide.html`):** Visual design system sandbox showcasing all components, typography, and motion physics.
4. **Node Test Runner (`dev/node-test-runner.mjs`):** Runs the same scenarios in a terminal using a development-only localStorage/event shim.

See [`docs/manual-test-guide.md`](./docs/manual-test-guide.md) for the login, API workflow, and real cross-tab badge check instructions.

---

## 5. Seed Accounts Matrix

| Email (Identifier) | Password | Role | Full Name | Department | Notes |
|---|---|---|---|---|---|
| `doctor@aplus.edu` | `Doctor123` | `doctor` | Ahmed Mansour | Computer Science | Teaches Course A (`SE301`) & B (`SE304`) |
| `doctor2@aplus.edu` | `Doctor2!` | `doctor` | Sara Nabil | Computer Science | Teaches Course C (`SE302`) |
| `student@aplus.edu` | `Student123` | `student` | Karim Adel | Computer Science | Enrolled in Course A |
| `student2@aplus.edu` | `Student2!` | `student` | Nour Hassan | Computer Science | Enrolled in Course A & B |
| `student3@aplus.edu` | `Student3!` | `student` | Yara Ibrahim | Computer Science | Enrolled in Course A, B, & C |
| `student4@aplus.edu` | `Student4!` | `student` | Omar Farouk | Computer Science | Enrolled in Course B & C |
| `student5@aplus.edu` | `Student5!` | `student` | Laila Mostafa | Computer Science | Enrolled in Course C **only** (isolation test) |
| `dept@aplus.edu` | `Dept123` | `department_admin` | Rania Hatem | Computer Science | Department administrator |
| `dean@aplus.edu` | `Dean123` | `super_admin` | Hassan Ali | Faculty of Computing & IT | College dean |
| `disabled@aplus.edu` | `Disabled123` | `student` | Disabled Student | Computer Science | Disabled account (login denied) |

---

## 6. How to Run the Project

Browsers block JavaScript ES Modules (`import`/`export`) when loaded directly from the `file://` protocol due to CORS security policies. The project must be served through a local HTTP server.

### Option A: VS Code Live Server (Recommended)
1. Open the project root folder in **Visual Studio Code**.
2. Install the **Live Server** extension (by *Ritwick Dey*).
3. Right-click `index.html` and select **"Open with Live Server"** (or click **"Go Live"** in the status bar).
4. The browser will open `http://127.0.0.1:5500/index.html`.

### Option B: Python Built-in HTTP Server
Run from the root directory in your terminal:
```bash
# Python 3
python3 -m http.server 3000
```
Then navigate to: `http://localhost:3000/index.html`

### Run the automated mock scenarios

From the project directory:
```bash
node dev/node-test-runner.mjs
```

Or open `http://localhost:3000/dev/test-runner.html` for the in-browser runner.

## Full demo script

Use two tabs on the same origin. For a clean run, remove only `aplus_mock_db` from that origin's Local Storage before opening the tabs. Leave **Remember me** unchecked in both tabs so each tab can keep its own role session.

1. In Tab 1, sign in as `doctor@aplus.edu` / `Doctor123`.
2. Select **Assignments** in the sidebar. Create an SE301 assignment with a title, description, future due date, and maximum grade. Open its submissions link and leave the tab there.
3. In Tab 2, sign in as `student@aplus.edu` / `Student123`. Select **Assignments**, open the new assignment, enter submission text, select **Submit assignment**, and confirm. Verify the AI feedback appears and the student view contains no AI score.
4. Return to Tab 1. Open the assignment submission, review the student's text and doctor-only AI score, enter a valid final grade and optional comment, then save. Verify the pending-grading badge decreases.
5. Return to Tab 2 and reopen the assignment. Verify the final grade and doctor's comment.
6. In Tab 1, select **Messages** and send a notice to the student. In Tab 2, verify the unread badge updates without reloading; open the message and verify it becomes read.

See [`docs/manual-test-guide.md`](./docs/manual-test-guide.md) for all page checks, responsive/accessibility checks, and the native cross-tab storage test.

---

## 6. Manual Test Checklist

Use this checklist to verify the shell and all working logic:

| # | Test Scenario | Steps to Execute | Expected Result |
|---|---|---|---|
| **1** | **Shared Fonts Load** | Inspect `css/tokens.css` and network tab. | Fonts (Plus Jakarta Sans, Inter, Montserrat, Source Serif 4) load in one shared place. Topbar uses bold Source Serif 4 and falls back cleanly to Georgia with no layout shift. |
| **2** | **No Tinted/Translucent Boxes** | Inspect every Student and Doctor page. | Zero chips, pills, soft badges, or translucent colored backgrounds. Unread badges are solid gold circles; status indicators use `.status` dots. |
| **3** | **Interactive Card Hover Lift** | Hover over `.card--interactive` (tested in `dev/style-guide.html`). | Card lifts 2px with an elevated shadow over 120ms; clicking active returns it to rest. |
| **4** | **Page Enter Animation** | Navigate to any student page. | `#page-content` fades in and rises 8px over 200ms with `--ease-out`. |
| **5** | **Count-Up Viewport Animation** | Open `dev/style-guide.html` and scroll to stat numbers. | Numbers count up smoothly from 0 to value with comma formatting once in viewport. |
| **6** | **Progress Ring Animation** | Observe progress rings in `dev/style-guide.html`. | Circular SVG rings render with role="img", accessible aria-label, and animate stroke dashoffset smoothly. |
| **7** | **Prefers-Reduced-Motion** | Emulate `prefers-reduced-motion: reduce` in DevTools Rendering panel. | All animations and transitions are disabled; count-up, progress rings, and page enter render final states immediately. |
| **8** | **Active Navigation Solid Blue** | Click through each navigation item. | Active item gets solid background `var(--primary)` (`#1F4B7F`), pure white text, and pure white icon with radius 10px. No gold indicator bar. |
| **9** | **Profile Footer Link** | Inspect bottom of sidebar and open Profile. | Displays one ellipsized `Eng. <name>` link with a title attribute; it navigates to Profile and has no hover background, color change, or underline. |
| **10** | **Hover Behavior** | Hover navigation, buttons, controls, and links. | Navigation alone uses soft light blue; solid buttons match Sign in; other controls use subtle gray-blue; no hover underlines appear. |
| **10** | **Button Tactile Feedback** | Click down on any `.btn`. | Button smoothly scales down to 0.98 on active click and returns on release. |
| **11** | **Auth Guard & Sign-in** | Test mock sign-in (`student@aplus.edu` / `Student123` or `doctor@aplus.edu` / `Doctor123`) and non-student access. | Full login, session guard, role checks, and logout redirects work reliably. |
| **12** | **Topbar Page Title** | Visit all 13 student routes and 12 doctor routes, including detail pages. | Every page has exactly one bold-serif topbar `<h1>`; sidebar fonts remain unchanged and `document.title` updates to `<title> · A Plus`. |
| **13** | **Doctor Shell & Navigation** | Sign in as `doctor@aplus.edu` / `Doctor123`. | Lands on `/doctor/dashboard.html`. Sidebar displays 8 doctor items (Dashboard, Courses, Assignments, Quizzes, Attendance, Students, Messages, Ratings). Footer shows `Dr. <Name>`. |
| **14** | **Doctor Assignments Gold Badge** | Observe Assignments item in doctor sidebar. | Shows solid gold circle badge with count `14` (pending submissions to grade), solving US-03. |
| **15** | **Cross-Role Route Guard** | Log in as Student and try navigating to `/doctor/dashboard.html` (or vice-versa). | Guard detects unauthorized role and automatically redirects user to their appropriate dashboard (`/student/dashboard.html`). |
