# A Plus – Progress Log

## Executive status

Mock logic stages 0–4 and all Student/Doctor UI stages A–E are implemented. All 25 Student and Doctor pages use the existing mock APIs; the AI-score privacy scan remains enabled. No dean/department-admin portal, real backend, or n8n integration is in scope.

## UI implementation status (2026-10-31)

### Page status

| Role | Page | Status | Notes |
|---|---|---|---|
| Student | Dashboard | done | `student/dashboard.html`, `js/student/dashboard.js`; hero, metrics, due work, course attendance, leaderboard, inbox and to-do previews. |
| Student | Courses | done | `student/courses.html`, `js/student/courses.js`; enrolled course cards and attendance rings. |
| Student | Course detail | done | `student/course.html`, `js/student/course.js`; lectures, assignments/quizzes, attendance, doctor/lecture ratings. |
| Student | Assignments | done | `student/assignments.html`, `js/student/assignments.js`; filters, status, due dates, grades. |
| Student | Assignment detail | done | `student/assignment.html`, `js/student/assignment.js`; confirmed one-time submit, 409/422 handling, feedback without AI score, final grade. |
| Student | Quizzes | done | `student/quizzes.html`, `js/student/quizzes.js`; list and status filters. |
| Student | Quiz detail/results | done | `student/quiz.html`, `js/student/quiz.js`; one-attempt quiz form and results. |
| Student | Attendance | done | `student/attendance.html`, `js/student/attendance.js`; course summaries, rings, history and warning threshold. |
| Student | To-do | done | `student/todo.html`, `js/student/todo.js`; add/edit/complete/delete and filters. |
| Student | Points | done | `student/points.html`, `js/student/points.js`; monthly total, rank, medals, earning rules and ledger. |
| Student | Roadmaps | done | `student/roadmaps.html`, `js/student/roadmaps.js`; read-only provisional steps and progress. |
| Student | Inbox | done | `student/inbox.html`, `js/student/inbox.js`; type filters, read state and shared badge updates. |
| Student | Profile | done | `student/profile.html`, `js/student/profile.js`; read-only profile and initials avatar. |
| Doctor | Dashboard | done | `doctor/dashboard.html`, `js/doctor/dashboard.js`; grading queue, deadlines, absence risk, anonymous ratings and quick actions. |
| Doctor | Courses | done | `doctor/courses.html`, `js/doctor/courses.js`; owned course cards. |
| Doctor | Course detail | done | `doctor/course.html`, `js/doctor/course.js`; lectures, enrolled count, assignments/quizzes and lecture create/edit. |
| Doctor | Assignments | done | `doctor/assignments.html`, `js/doctor/assignments.js`; owned-course creation, validation and pending counts. |
| Doctor | Assignment detail | done | `doctor/assignment.html`, `js/doctor/assignment.js`; doctor-only AI evaluation and grading panel. |
| Doctor | Quizzes | done | `doctor/quizzes.html`, `js/doctor/quizzes.js`; list, create and results links. |
| Doctor | Quiz results | done | `doctor/quiz.html`, `js/doctor/quiz.js`; quiz editing and attempt/score summary. |
| Doctor | Attendance | done | `doctor/attendance.html`, `js/doctor/attendance.js`; roster recording, history and warning confirmation. |
| Doctor | Students | done | `doctor/students.html`, `js/doctor/students.js`; course filter, attendance/grade/points and bonus dialog. |
| Doctor | Messages | done | `doctor/messages.html`, `js/doctor/messages.js`; compose by course/recipients and sent list. |
| Doctor | Ratings | done | `doctor/ratings.html`, `js/doctor/ratings.js`; anonymous course aggregates and comments. |
| Doctor | Profile | done | `doctor/profile.html`, `js/doctor/profile.js`; read-only profile and initials avatar. |

### Shared components and stage notes

- Shared modules: `toast.js`, `dialog.js`, `tabs.js`, `data-table.js`, `empty-state.js`, `error-state.js`, `skeleton.js`, `form-field.js`, `status-dot.js`, `date-format.js`, `page-state.js`, `metric-card.js`, `leaderboard.js`, `progress-bar.js`, and `profile-card.js`; existing progress rings remain in use.
- Stage A added the doctor-only submitted `content` field to assignment responses and field-level 422 details. Student responses remain unchanged; the AI-score scan covers all student endpoint responses.
- Stage C added course-detail lecture data and `doctor_id`, plus the doctor quiz-results route. Stage D added the current-month points ledger and doctor roster current-month-points field.
- Fixed points reset-date construction to use UTC month boundaries and added an assertion for the calendar date.
- Date-only formatting now uses local calendar parts, avoiding a one-day shift west of UTC. Count-up metrics preserve decimal precision, and reduced-motion mode renders final values immediately.
- Shared confirmation, bonus-award, and lecture dialogs explicitly handle Escape and restore focus to the invoking control.
- Stage E implemented both dashboards. Their totals are derived from existing aggregate routes and seed data.
- The full page-by-page, two-tab, responsive, keyboard and reduced-motion walkthrough is documented in `docs/manual-test-guide.md`.

## Step 0 verification (2026-10-30)

| Check | Result |
|---|---|
| Imports of legacy `js/mock/student-mock-data.js` or `js/mock/doctor-mock-data.js` | None. The student mock data file is preserved as an unused legacy artifact from GitHub history; no doctor mock data file is present. |
| Legacy mock endpoint coverage | All student operations exposed by the legacy `mockDataStore` are now represented by current `/student/*` mock routes. The separate legacy doctor mock file was not present in the available old project snapshot, so a complete old-doctor endpoint comparison cannot be confirmed. Every current doctor API client operation has a corresponding route in `js/mock/mock-server.js`. |
| `logout()` / `clearSession()` preserving `aplus_mock_db` | Verified: both clear auth keys but preserve the mock database. |
| Login dispatch | Verified: `js/api.js` posts `/auth/login` through `mockServerHandle()` when `USE_MOCK` is true. |
| Seed login results | All nine enabled accounts authenticate successfully. `disabled@aplus.edu` / `Disabled123` returns 403 as designed; it is a disabled test account and cannot log in. Full account list follows below. |
| Student 1's seeded unread messages | `msg-2` (`system`, “Grade Posted: SE301 – Assignment 2”), `msg-8` (`warning`, “SE301 – Submission Deadline Reminder”), and `msg-9` (`suggestion`, “SE301 – Suggested Review Before Assignment 1”) are unread. |

| Name | Role | Email | Password | Courses |
|---|---|---|---|---|
| Ahmed Mansour | doctor | `doctor@aplus.edu` | `Doctor123` | SE301, SE304 |
| Sara Nabil | doctor | `doctor2@aplus.edu` | `Doctor2!` | SE302 |
| Karim Adel | student | `student@aplus.edu` | `Student123` | SE301 |
| Nour Hassan | student | `student2@aplus.edu` | `Student2!` | SE301, SE304 |
| Yara Ibrahim | student | `student3@aplus.edu` | `Student3!` | SE301, SE304, SE302 |
| Omar Farouk | student | `student4@aplus.edu` | `Student4!` | SE304, SE302 |
| Laila Mostafa | student | `student5@aplus.edu` | `Student5!` | SE302 |
| Rania Hatem | department_admin | `dept@aplus.edu` | `Dept123` | None |
| Hassan Ali | super_admin | `dean@aplus.edu` | `Dean123` | None |
| Disabled Student | student | `disabled@aplus.edu` | `Disabled123` | None |

## Stage checklist

- [x] Stage 0 – Verify repo state, inspect mock server, inspect scenarios, and confirm route wiring.
- [x] Stage 1 – Shared mock system and seed data are present in `js/mock/` and `js/dev/`.
- [x] Stage 2 – Assignment, submission, grading, and quiz lifecycle logic are implemented and covered by automated scenarios.
- [x] Stage 3 – Attendance, one-time absence warnings, doctor messages, student inbox, and cross-tab badge verification.
- [x] Stage 4 – Points, ratings, todos, dashboards, and API/data-model documentation.

## UI stage checklist

- [x] Stage A – Shared components and assignment-to-grading demo.
- [x] Stage B – Inbox, messages, notification dropdown, and attendance for both roles.
- [x] Stage C – Courses/course details, lectures, quizzes, and quiz results for both roles.
- [x] Stage D – Points, to-do, students, ratings, roadmaps, and profiles.
- [x] Stage E – Student and doctor dashboards, seed-data pass, responsive/accessibility review, README demo script, and manual guide.

## Scenario status

| Scenario | Status | Notes |
|---|---|---|
| `sc-1-auth-scope` | done | Auth and scope enforcement pass.
| `sc-2-assignment-creation-visibility` | done | Assignment visibility and enrollment isolation pass.
| `sc-3-student-submission-ai-feedback` | done | Single-submission enforcement and AI feedback pass.
| `sc-4-doctor-grading-flow` | done | Doctor grading and student visibility pass.
| `sc-5-quiz-lifecycle` | done | Quiz creation, attempt enforcement, auto-grade, and doctor visibility pass.
| `sc-2b-cross-doctor-isolation` | done | Cross-doctor writes are blocked.
| `sc-2c-student-ai-score-leak-check` | done | No `ai_score` leak detected in student endpoints.
| `sc-12-persistence` | done | localStorage persistence and reset logic pass.
| `sc-13-cross-tab` | done | Updated to the correct unread-count expectation: student 1 starts with 3 unread messages and rises to 4 after one more is sent.
| `sc-6-attendance-absence-warning` | done | Invalid attendance is rejected without partial writes; threshold warning appears once and later absences do not duplicate it.
| `sc-7-doctor-messages-inbox` | done | Recipient scope, message type, outbox, inbox, unread/read state all verified.
| `sc-8-points-monthly-ledger` | done | Current-month totals, month reset, and doctor bonus awards verified.
| `sc-9-ratings-anonymity-cooldown` | done | Target and score validation, 7-day cooldown, and anonymous doctor aggregate verified.
| `sc-10-todo-ownership-crud` | done | Validation, enrolled-course constraint, owner isolation, update, and delete verified.
| `sc-11-dashboard-aggregates` | done | Dashboard totals cross-checked against course, assignment, quiz, attendance, points, inbox, roster, and rating endpoints.

## What was broken

- The project had no lightweight Node runner for the scenario suite, which made CLI validation impossible without a browser.
- Scenario 13 assumed a seed unread count of 1 for student 1, but the seed data actually contains 3 unread messages (`msg-2`, `msg-8`, `msg-9`), so the correct post-send total is 4.
- The README seed account table was missing the disabled account and did not match the exact names/passwords in `js/mock/seed/users.js`.
- No `docs/PROGRESS.md` existed yet, so a resumable status file was missing.
- Initial Stage 3/4 runs found validation and aggregate defects: attendance accepted invalid statuses and could skip unenrolled students; doctor messages silently dropped out-of-scope recipients; invalid message types defaulted to notice; rating target IDs were not validated; todo priority/course values were not validated; and the student dashboard omitted not-yet-started quizzes from its upcoming count. These were fixed in `js/mock/mock-server.js`.
- The points scenario's first expected value was wrong: `new_total_bonus` is a cumulative total across all bonus ledger entries, including the seeded September award. The test now compares against seeded cumulative bonus plus the new award; endpoint behavior was retained.
- The legacy student store supported course lookup by course code as well as ID; current student and doctor detail routes now preserve that behavior, verified in `sc-1-auth-scope`.
- `sc-13-cross-tab` now distinguishes same-tab custom events from native storage events. The Node shim no longer emits a fake same-tab storage event.
- The student AI-score leak scan now covers every student GET endpoint and successful student mutation response.

## Verification notes

- No stale imports to `js/mock/student-mock-data.js` or `js/mock/doctor-mock-data.js` were found in this project. The preserved legacy student mock store has matching current student routes; an old doctor mock file was not available for a direct legacy comparison.
- All relative JavaScript imports and local HTML script paths resolve.
- Node test run: 15 passed, 0 failed (`node dev/node-test-runner.mjs`), including the date-only points-reset assertion and the doctor submission-content assertion.
- In-browser runner: 15 passed, 0 failed (`dev/test-runner.html`), including the date-only points-reset assertion and the zero-tolerance student AI-score scan.
- Real browser cross-tab check: Inbox badge changed from 3 to 4 after a doctor tab sent a message; no reload was used.
- Fresh-origin smoke check: all 13 student and 12 doctor pages rendered without page/console errors. At 360px, no page had document-level horizontal overflow; wide tables stayed in their own scroll containers.
- Keyboard check: confirmation and bonus dialogs close on Escape and return focus to their trigger. Reduced-motion check: all dashboard count-up values, including the 4.5 rating, show their final values without animation.
- CSS/code consistency scan found no inline styles/handlers in the page/component JavaScript and no raw colors or hover underlines in `css/components.css`.
- `logout()` and `clearSession()` preserve `aplus_mock_db`; login routes through the mock server.
- Nine active accounts authenticate; the disabled seed account correctly returns 403. The account list in `js/mock/seed/users.js` is the source of truth.
- The parent Git root is `/Users/abdallamohamed` and contains an unrelated portfolio repository; the A Plus directory is untracked and has no standalone `.git`. No commit was made to avoid committing unrelated files.
- All 25 Student/Doctor pages are implemented. Roadmaps remain explicitly provisional/read-only. The full manual walkthrough is in `docs/manual-test-guide.md`.
- The reset-date response is a calendar date (`YYYY-MM-DD`); the formatter handles date-only values in local time, and the scenario asserts both API value and rendered calendar date.
- The A Plus directory has no standalone Git repository. The parent repository is an unrelated portfolio, so no commit was made.
