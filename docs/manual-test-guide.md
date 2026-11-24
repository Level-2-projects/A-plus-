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

For the in-browser suite, open `http://localhost:3000/dev/test-runner.html` and select **Run All Scenarios**. The current Node suite verifies 24 scenarios; browser execution should report the same set.

## Sign-in and scope checks

| Account | Expected result |
|---|---|
| `student@aplus.edu` / `Student123` | Student dashboard |
| `doctor@aplus.edu` / `Doctor123` | Doctor dashboard |
| `dept@aplus.edu` / `Dept123` | Department Admin dashboard |
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
| Messages | Compose and send notice, warning, or suggestion messages to a course or selected students; verify the sent record and recipient count. In the **Received** tab, view incoming department admin broadcasts with unread gold dots; clicking a message displays the message body and marks it as read, decrementing the unread count and updating the sidebar and notification bell badges. |
| Ratings | Filter course aggregates and anonymous comments; verify that no student identity is shown. |
| Profile | Verify read-only account information and initials avatar. |

## Department Admin page checks

1. Sign in as `dept@aplus.edu` / `Dept123`. On **Dashboard**, verify the department welcome card, count-up metrics, top-three medals, and absence-risk list against the seeded Computer Science data.
2. Open **Students**. Search by student name, email, and university ID; filter by a department course and by active/deactivated status. Verify the table scrolls horizontally within its own container at narrow widths.
3. Choose **Add student**. Enter full name, email, university ID, and an academic level from 1 to 5. Verify required/invalid fields render beneath their controls and a duplicate email or university ID produces the API error.
4. After creation, copy the temporary password from the one-time dialog, close it, and confirm it is no longer exposed by the directory.
5. Edit the student, change the level, then deactivate and reactivate the account after each confirmation. Verify the solid-dot status updates after the table reloads.
6. Choose **Manage enrollments**. Add an available department course, then remove an existing enrollment. Verify the course list updates after each operation.
7. Open **Doctors**. Add/edit a doctor, copy the one-time password, deactivate/reactivate the account, and assign department courses.
8. Open **Courses**. Create and edit a course, choose only a department doctor, and verify code, doctor, enrolled count, and color value render in the scrollable table.
9. Open **Attendance**. Filter by a department course and verify each row shows its aqua attendance bar, tabular percentage, session count, and at-risk count. Confirm the at-risk table uses the configured absence threshold. A separate sent-warning history is not available from the current admin API.
10. Open **Points**. Verify the current-month top three uses solid medals and the full department ranking has rank, student, and points. The existing route has no month parameter, so previous-month selection is intentionally unavailable.
11. Open **Messages**. In **Received**, open an unread item and verify its unread dot and the Messages navigation badge update. In **Sent**, verify audience and recipient count. In **Compose**, send to students, doctors, both, or one department course; required subject/body errors must appear under their fields. The dean is not offered as an audience.

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


## Dean portal – batch 2 (Reports, Announcements, Inbox, Settings)

Sign in as `dean@aplus.edu` / `Dean123` and navigate to `http://127.0.0.1:5500/super-admin/`.

### Reports (`super-admin/reports.html`)

1. Open **Reports**. Confirm four tabs appear: Attendance, Submissions & Grades, Doctor Ratings, At-Risk Students.
2. Switch the period filter (This Month / Last 30 Days / All Time) and confirm the data area reloads.
3. Use the department drop-down to filter by one department; confirm all table rows belong to that department.
4. Each tab: confirm the **Export CSV** button downloads a `.csv` file named `{tab}_{YYYY-MM-DD}.csv`.
5. Open the downloaded CSV in a spreadsheet; confirm it opens without encoding errors (UTF-8 BOM), all columns are present, and cells with commas or quotes are properly escaped.
6. Doctor Ratings tab: confirm anonymous comments appear below the summary table and no student name or AI score appears anywhere.
7. At-Risk Students tab: confirm rows show department, course code and absence count — no student identities.

### Announcements (`super-admin/announcements.html`)

1. Open **Announcements** → Compose tab.
2. Select audience **Whole College**, fill in subject and body, click **Send Announcement**. Confirm a toast appears with the recipient count (should be all non-dean users).
3. The page should switch to the **Sent** tab showing the new broadcast row with audience, subject, recipients and date.
4. Return to Compose. Select **Department (all roles)** — confirm a Department drop-down appears.
5. Leave the department blank and try to send; confirm a 422 field error appears on the department field.
6. Select a department, fill in subject and body, send. Confirm toast and Sent row.
7. Select audience **Course** — confirm the department field appears. Select audience **College** again — confirm both conditional fields hide.
8. Submit with an empty subject; confirm a 422 field error appears on that field.

### Inbox (`super-admin/inbox.html`)

1. Open **Inbox**. Confirm the sidebar badge shows the correct unread count.
2. If the seed DB has no messages to the dean, use the mock playground or admin messages UI to send one to the dean first.
3. Unread messages show a solid gold dot in the list.
4. Click a message; confirm the detail pane shows sender, date, type dot, and body. Confirm the unread dot disappears and the sidebar badge decreases.
5. Switch to the **Unread** tab; confirm the read message no longer appears.
6. Switch back to **All**; confirm the read message still appears (without a dot).

### Settings (`super-admin/settings.html`)

1. Open **Settings**. Confirm the form shows five fields with their current values and hint text.
2. If `updated_at` is set, confirm a "Last updated" line appears above the form.
3. Change the **Absence Warning Threshold** to `0` (out of range) and save; confirm a 422 inline error.
4. Change the threshold to `5` (valid) and save; confirm a success toast and "Last updated" refreshes.
5. Click **Reset to Defaults** and confirm a dialog appears. Cancel and confirm nothing changed.
6. Click Reset, confirm and confirm all five fields return to their default values and a success toast appears.
7. As `dept@aplus.edu`, attempt `PATCH /dean/settings`; expect a 403 (covered by sc-22).


## Full 4-Role End-to-End Demo Script (6–8 minutes)

Follow the step-by-step walkthrough in [`README.md`](../README.md#full-demo-script-6-to-8-minutes-walkthrough-across-all-four-roles):
1. **Dean creates Department & Admin**: Dean provisions `Artificial Intelligence` department and admin `sami@aplus.edu` (temporary password copied).
2. **Admin provisions Doctor, Course & Student**: Admin creates Dr. Tarek Fayed, course `AI401`, student Ziad Amr, and enrolls student.
3. **Doctor creates Assignment**: Dr. Tarek creates `Assignment 1: Backpropagation from Scratch` with max grade 20.
4. **Student submits work & sees AI feedback with zero score**: Ziad submits; gets instant structured AI feedback without AI score.
5. **Doctor reviews AI score & grades submission**: Doctor views AI evaluation score (`8.8 / 10`) and posts final grade 18/20.
6. **Dean tightens Absence Threshold**: Dean changes threshold to `1` in Settings; takes effect immediately.
7. **Attendance creates Warning**: Doctor marks student absent; student inbox instantly receives Absence Warning with gold badge.
8. **Dean Broadcast & Reports CSV**: Dean broadcasts college notice and exports CSV report with UTF-8 BOM.
