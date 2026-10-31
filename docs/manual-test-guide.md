# A Plus Manual Test Guide

## Start the application

From the project directory, run:

```bash
python3 -m http.server 3000
```

Open `http://localhost:3000/index.html`. ES modules require HTTP; do not open pages with `file://`.

Run the Node scenarios:

```bash
node dev/node-test-runner.mjs
```

For the in-browser suite, open `http://localhost:3000/dev/test-runner.html` and select **Run All Scenarios**. Expect 15 passed and 0 failed.

## Sign-in and scope checks

| Account | Expected result |
|---|---|
| `student@aplus.edu` / `Student123` | Student dashboard |
| `doctor@aplus.edu` / `Doctor123` | Doctor dashboard |
| `dept@aplus.edu` / `Dept123` | Credentials authenticate; no department-admin portal is in scope |
| `dean@aplus.edu` / `Dean123` | Credentials authenticate; no dean portal is in scope |
| `disabled@aplus.edu` / `Disabled123` | Login is rejected as disabled |

Try opening a doctor route as a student and a student route as a doctor. The guard must redirect to the signed-in role's dashboard. Sign out and confirm that authentication is cleared while `aplus_mock_db` remains present.

## Student page checks

| Page | Checks |
|---|---|
| Dashboard | Welcome name, due-soon work, attendance-by-course rings, monthly points/rank, unread count, top three, inbox preview, and to-do preview render from seed data. |
| Courses and course detail | Enrolled courses only; open a course and verify lectures, assignments/quizzes, attendance, doctor rating, lecture rating, and the rating cooldown response. |
| Assignments and detail | Filter All / To do / Submitted / Graded; open an assignment, submit once, confirm the irreversible action, verify AI feedback without any AI score, then verify the final grade after a doctor grades it. |
| Quizzes and quiz detail | Open a quiz, answer every question, confirm one-attempt submission, and verify score/correct answers when returned. |
| Attendance | Verify per-course rings, present/absent counts, warning threshold, and the session-history status dots. |
| To-do | Add, edit, complete, filter, and delete a task; verify the delete confirmation and inline validation. |
| Points | Verify monthly total, rank, top-three medals, earning rules, reset date, and ledger. |
| Roadmaps | Verify step states and progress; content is explicitly provisional and read-only. |
| Inbox | Filter all/unread/type, open a message, and verify it becomes read and the sidebar/bell counts update. |
| Profile | Verify read-only account information and initials avatar. |

## Doctor page checks

| Page | Checks |
|---|---|
| Dashboard | Verify grading queue, deadlines, at-risk list, average rating, latest anonymous comments, and quick-action links. |
| Courses and course detail | Verify owned courses/enrollment; create and edit a lecture and confirm the ordered course lecture list updates. |
| Assignments and detail | Create an assignment in an owned course; open submissions, review student text and doctor-only AI score, grade within the maximum, and verify the pending badge updates. |
| Quizzes and results | Create a quiz with choices and correct answers; open results and verify attempts, scores, and average. |
| Attendance | Record a course session and present/absent roster; verify the one-time warning note and resulting student inbox message at the configured threshold. |
| Students | Filter by course, review attendance/grade/monthly points, and award bonus points with valid and invalid values. |
| Messages | Send notice, warning, or suggestion messages to a course or selected students; verify the sent record and recipient count. |
| Ratings | Filter course aggregates and anonymous comments; verify that no student identity is shown. |
| Profile | Verify read-only account information and initials avatar. |

## Assignment demo: create, submit, and grade

1. Sign in as `doctor@aplus.edu` / `Doctor123` and open **Assignments**.
2. Create an assignment for **SE301** with a title, description, future deadline, and maximum grade. Open its submissions link.
3. In a second tab on the same origin, sign in as `student@aplus.edu` / `Student123` with **Remember me** unchecked.
4. Open **Assignments**, select the new assignment, enter submission text, choose **Submit assignment**, and confirm. Verify feedback appears and no AI score is visible.
5. In the doctor tab, open the same assignment, select the submission, review the text and AI score, enter a valid grade and optional feedback, then save.
6. Verify the doctor pending badge decreases and the student sees the final grade and doctor feedback.

## Real cross-tab unread badge check

This verifies the browser's native `storage` event rather than the Node test shim:

1. Use a clean browser origin, or remove only `aplus_mock_db` in DevTools Application → Local Storage before signing in.
2. Open two tabs on the same origin. Sign in as the student in one and the doctor in the other. Leave **Remember me** unchecked in both tabs so each tab has its own role token in `sessionStorage`.
3. Confirm the student starts with 3 unread messages.
4. In the doctor tab, open **Messages** and send a notice to `student@aplus.edu`.
5. Confirm the student's Inbox badge increases to 4 without reloading. Open the message and confirm the badge decreases in both the sidebar and bell dropdown.

If the UI is unavailable for sending, the same storage check can be exercised from the doctor tab's DevTools Console with the existing API client:

```javascript
import("../js/api/doctor-api.js").then(({ sendDoctorMessage }) =>
  sendDoctorMessage({
    course_id: "crs-a",
    recipient_ids: ["usr-1"],
    type: "notice",
    subject: "Cross-tab check",
    body: "A new message should update the student badge.",
  })
);
```

## Responsive, keyboard, and design checks

- At 360px wide, verify the existing sidebar drawer replaces the desktop sidebar and no page introduces horizontal overflow outside its own table container.
- Navigate using only the keyboard. Check visible focus, tabs, dialogs, confirmation with Escape, and restored focus after a dialog closes.
- Enable `prefers-reduced-motion: reduce`; count-up and progress animations should show final values without motion.
- Confirm status uses solid dots and text, badges are reserved for unread/pending counts, medals are solid circles, and no colored tinted/translucent status boxes or hover underlines appear.
- Inspect the browser console on the Student and Doctor pages; no module, API, or accessibility-related errors should appear.

## API playground

Open `dev/mock-playground.html` to choose a seeded identity, run its listed API-client operations, inspect response JSON, and inspect/reset the shared mock database. See [`api-contract.md`](./api-contract.md) for all 44 routes.
