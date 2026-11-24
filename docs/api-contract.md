# A Plus (A+) – Complete REST API Contract

> **Target Audience:** FastAPI + SQL Server Backend Engineering Team & Client Integrators  
> **Base URL:** `http://localhost:8000` (configurable in `js/config.js`)  
> **Authentication:** HTTP Bearer token passed in the `Authorization` header (`Authorization: Bearer <jwt_access_token>`).  
> **Total Endpoints:** 86 routes across 4 roles + public authentication.

---

## 1. Global Architecture & Standards

### 1.1 Authentication & Token Format
All protected endpoints require an HTTP Bearer token:
```http
Authorization: Bearer <token>
Content-Type: application/json
```
- **Mock Token Format:** `aplus-mock-<user_id>` (e.g., `aplus-mock-usr-1` for student, `aplus-mock-usr-6` for doctor, `aplus-mock-usr-8` for department admin, `aplus-mock-usr-9` for dean).
- **Production JWT Claims Requirement:** The FastAPI backend JWT payload must carry:
  - `sub`: User ID (e.g. `usr-1`).
  - `role`: One of `"student"`, `"doctor"`, `"department_admin"`, `"super_admin"`.
  - `department_id`: Department UUID string (null for super_admin).
  - `exp`: Expiration Unix timestamp.

### 1.2 Common Error Response Format
All 4xx and 5xx errors return JSON:
```json
{
  "status": 422,
  "message": "Validation failed",
  "details": {
    "field_name": "Field-specific error message"
  }
}
```
For non-validation errors (401, 403, 404, 409, 429), a uniform object is returned:
```json
{
  "message": "Descriptive error message"
}
```

### 1.3 Dynamic Runtime Settings
The following institutional settings are persisted in the database and affect endpoint behavior immediately upon modification by the Dean (`PATCH /dean/settings`):
- `absence_warning_threshold` (int 1–20, default `2` or `3`): Absences in a single course reaching or exceeding this threshold immediately trigger a one-time automated Absence Warning message delivered to the student inbox.
- `rating_cooldown_days` (int 1–365, default `7` or `30`): Cooldown period between successive ratings submitted by the same student for the same course or doctor. Subsequent submissions within the window return `429 Too Many Requests`.
- `points_submission_on_time` (int 0–1000, default `50` or `10`): Points awarded to student ledger upon on-time assignment submission.
- `points_quiz_completion` (int 0–1000, default `30` or `5`): Points awarded upon quiz attempt completion.
- `points_attendance_present` (int 0–1000, default `10` or `2`): Points awarded to each student marked present in an attendance session.

### 1.4 Integration Points for n8n
1. **Assignment AI Feedback Generation**: When a student calls `POST /student/assignments/{assignment_id}/submit`, n8n evaluates the code submission and outputs:
   - `feedback_summary`: Detailed architectural rubric feedback visible immediately to the student (without score).
   - `score_out_of_10`: Internal AI opinion score stored in `ai_score_out_of_10` and visible **only** to the doctor in grading review.
2. **Absence Warning Automation**: Upon attendance submission (`POST /doctor/attendance`), when an enrolled student reaches `absence_warning_threshold`, n8n or server logic delivers an immediate alert message to the student inbox and sends an email notification.
3. **Weekly Summary Digest**: Scheduled recurring workflow triggered every Sunday compiling attendance rates, upcoming assignment deadlines, and current points rankings.
4. **Deadline Reminders**: Daily reminder trigger notifying students with pending assignments 24 hours prior to `due_date`.

---

## 2. Authentication Route (Public)

### 2.1 User Login
Authenticates an active university identity and issues an access token.

- **Method / Path:** `POST /auth/login`
- **Allowed Roles:** Public (unauthenticated)
- **Request Body:**
```json
{
  "identifier": "student@aplus.edu",
  "password": "Student123"
}
```
  - `identifier` (string, required): University email or university ID. Case-insensitive.
  - `password` (string, required): Account password.
- **Response `200 OK`:**
```json
{
  "access_token": "aplus-mock-usr-1",
  "token_type": "bearer",
  "user": {
    "id": "usr-1",
    "full_name": "Karim Adel",
    "role": "student",
    "department": "Computer Science"
  }
}
```
- **Error Statuses:**
  - `401 Unauthorized`: `{"message": "Invalid credentials."}` (incorrect password or user not found).
  - `403 Forbidden`: `{"message": "Account disabled."}` (disabled test or suspended account).
  - `422 Unprocessable Entity`: `{"status": 422, "message": "Validation failed", "details": {"credentials": "Identifier and password are required."}}`.
- **Business Rule & Source:** Authenticates against registered active users in `db.users`. Disabled accounts rejected immediately. Handled in `js/mock/routes/auth-routes.js`, verified in `sc-1-auth-scope`.

---

## 3. Student Domain Endpoints

### 3.1 Student Dashboard Summary
Retrieves aggregate metrics and counters for the main student dashboard.

- **Method / Path:** `GET /student/dashboard/summary`
- **Allowed Roles:** `student`
- **Parameters:** None
- **Request Body:** None
- **Response `200 OK`:**
```json
{
  "enrolled_courses": 3,
  "pending_assignments": 1,
  "upcoming_quizzes": 1,
  "attendance_rate": 88.9,
  "points": 110,
  "rank": 1,
  "unread_messages": 3
}
```
- **Error Statuses:**
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: User role is not `student`.
- **Business Rule & Source:** Derived strictly from student enrollments, pending work, and points. Handled in `js/mock/handlers/student-academic-handlers.js`, verified in `sc-11-dashboard-aggregates`.

---

### 3.2 Enrolled Courses
Retrieves all courses currently enrolled by the authenticated student.

- **Method / Path:** `GET /student/courses`
- **Allowed Roles:** `student`
- **Parameters:** None
- **Request Body:** None
- **Response `200 OK`:**
```json
[
  {
    "id": "crs-a",
    "code": "SE301",
    "title": "Software Architecture & Design Patterns",
    "doctor_name": "Dr. Ahmed Mansour",
    "credit_hours": 3,
    "schedule": "Sun & Tue 10:00–11:30 AM",
    "room": "Hall 3B",
    "color": "#2563eb",
    "attendance_rate": 100,
    "enrolled_count": 3
  }
]
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Enrolled courses only via `db.enrollments`. Handled in `student-academic-handlers.js`, verified in `sc-1-auth-scope`.

---

### 3.3 Single Course Detail
Retrieves comprehensive details for a specific enrolled course.

- **Method / Path:** `GET /student/courses/{course_id}`
- **Allowed Roles:** `student`
- **Path Parameters:** `course_id` (string, required): Course identifier or code.
- **Request Body:** None
- **Response `200 OK`:**
```json
{
  "id": "crs-a",
  "code": "SE301",
  "title": "Software Architecture & Design Patterns",
  "doctor_name": "Dr. Ahmed Mansour",
  "doctor_id": "usr-6",
  "lectures": [
    { "id": "lec-a1", "number": 1, "title": "The Architecture Landscape", "date": "2026-10-06" }
  ],
  "attendance_summary": { "present": 3, "absent": 0, "total": 3, "percentage": 100 }
}
```
- **Error Statuses:**
  - `404 Not Found`: Course does not exist or student is not enrolled.
- **Business Rule & Source:** Unenrolled students receive 404 to prevent enumeration. Handled in `student-academic-handlers.js`, verified in `sc-1-auth-scope`.

---

### 3.4 Student Assignments List
Retrieves all assignments for courses enrolled by the authenticated student.

- **Method / Path:** `GET /student/assignments`
- **Allowed Roles:** `student`
- **Parameters:** None
- **Request Body:** None
- **Response `200 OK`:**
```json
[
  {
    "id": "asg-a2",
    "course_code": "SE301",
    "title": "Assignment 2: Hexagonal Architecture Refactoring",
    "due_date": "2026-10-15T23:59:00Z",
    "max_grade": 20,
    "status": "graded",
    "final_grade": 17,
    "doctor_feedback": "Excellent refactoring."
  }
]
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** AI score (`ai_score_out_of_10`) is NEVER returned to students. Handled in `student-academic-handlers.js`, verified in `sc-2c-student-ai-score-leak-check`.

---

### 3.5 Single Student Assignment
Retrieves detail and submission history of a single assignment.

- **Method / Path:** `GET /student/assignments/{assignment_id}`
- **Allowed Roles:** `student`
- **Path Parameters:** `assignment_id` (string, required)
- **Response `200 OK`:**
```json
{
  "id": "asg-a2",
  "course_id": "crs-a",
  "course_code": "SE301",
  "title": "Assignment 2: Hexagonal Architecture Refactoring",
  "description": "Refactor the monolith into ports and adapters.",
  "due_date": "2026-10-15T23:59:00Z",
  "max_grade": 20,
  "status": "graded",
  "submission": {
    "submitted_at": "2026-10-14T14:20:00Z",
    "content": "Attached refactored codebase.",
    "is_late": false,
    "ai_feedback": "Strong separation of domain logic from infrastructure.",
    "final_grade": 17,
    "doctor_feedback": "Excellent refactoring.",
    "graded_at": "2026-10-22T10:00:00Z"
  }
}
```
- **Error Statuses:** `401`, `403`, `404`.
- **Business Rule & Source:** AI score omitted. Handled in `student-academic-handlers.js`, verified in `sc-2c-student-ai-score-leak-check`.

---

### 3.6 Submit Assignment
Submits student work for evaluation. Triggers automated instant AI feedback with zero score leak.

- **Method / Path:** `POST /student/assignments/{assignment_id}/submit`
- **Allowed Roles:** `student`
- **Path Parameters:** `assignment_id` (string, required)
- **Request Body:**
```json
{
  "content": "Full source code implementation and architecture justification."
}
```
  - `content` (string, required): Non-empty text or repository link.
- **Response `201 Created`:**
```json
{
  "id": "sub-1",
  "assignment_id": "asg-a1",
  "submitted_at": "2026-11-24T10:00:00Z",
  "is_late": false,
  "ai_feedback": "Strong modular decomposition. Ports and adapters are cleanly isolated.",
  "doctor_final_grade": null
}
```
- **Error Statuses:**
  - `404 Not Found`: Assignment does not exist or student unenrolled.
  - `409 Conflict`: `{"message": "You have already submitted this assignment."}` (one-time submit rule).
  - `422 Unprocessable Entity`: `{"details": {"content": "Submission content is required."}}`.
- **Business Rule & Source:** Strictly one submission per student per assignment. Awards `points_submission_on_time` if on-time. Handled in `student-academic-handlers.js`, verified in `sc-3-student-submission-ai-feedback`.

---

### 3.7 Student Quizzes List
Retrieves all quizzes for enrolled courses with student attempt state.

- **Method / Path:** `GET /student/quizzes`
- **Allowed Roles:** `student`
- **Response `200 OK`:**
```json
[
  {
    "id": "qz-1",
    "course_code": "SE301",
    "title": "Quiz 1: Architecture Patterns",
    "duration_minutes": 20,
    "status": "attempted",
    "score": 18,
    "total": 20
  }
]
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `student-academic-handlers.js`, verified in `sc-5-quiz-lifecycle`.

---

### 3.8 Single Student Quiz
Retrieves quiz metadata and questions if active and not yet attempted.

- **Method / Path:** `GET /student/quizzes/{quiz_id}`
- **Allowed Roles:** `student`
- **Path Parameters:** `quiz_id` (string, required)
- **Response `200 OK`:**
```json
{
  "id": "qz-1",
  "course_code": "SE301",
  "title": "Quiz 1: Architecture Patterns",
  "duration_minutes": 20,
  "status": "active",
  "questions": [
    {
      "id": "q1",
      "text": "What is the primary role of an adapter in Hexagonal Architecture?",
      "options": ["Encapsulate infrastructure concerns", "Define domain interfaces"],
      "points": 5
    }
  ]
}
```
- **Error Statuses:** `401`, `403`, `404`.
- **Business Rule & Source:** `correct_index` is omitted. Questions only provided during active window. Handled in `student-academic-handlers.js`, verified in `sc-5-quiz-lifecycle`.

---

### 3.9 Attempt Quiz
Submits answers for an active quiz with automated auto-grading.

- **Method / Path:** `POST /student/quizzes/{quiz_id}/attempt`
- **Allowed Roles:** `student`
- **Path Parameters:** `quiz_id` (string, required)
- **Request Body:**
```json
{
  "answers": [0, 2, 1, 3]
}
```
  - `answers` (array of integers, required): Selected option indices corresponding to quiz questions.
- **Response `201 Created`:**
```json
{
  "quiz_id": "qz-1",
  "score": 20,
  "total": 20,
  "passed": true,
  "submitted_at": "2026-11-24T10:15:00Z"
}
```
- **Error Statuses:**
  - `400 Bad Request`: `{"message": "This quiz is not currently available."}` (outside active window).
  - `404 Not Found`: Quiz not found or student unenrolled.
  - `409 Conflict`: `{"message": "You have already attempted this quiz."}` (single attempt rule).
  - `422 Unprocessable Entity`: `{"details": {"answers": "Answers must match question count."}}`.
- **Business Rule & Source:** Exactly one attempt allowed. Awards `points_quiz_completion` on attempt. Handled in `student-academic-handlers.js`, verified in `sc-5-quiz-lifecycle`.

---

### 3.10 Student Attendance History
Retrieves per-course attendance records and current absence warning threshold.

- **Method / Path:** `GET /student/attendance`
- **Allowed Roles:** `student`
- **Response `200 OK`:**
```json
{
  "overall_percentage": 92.5,
  "absence_warning_threshold": 2,
  "courses": [
    {
      "course_id": "crs-a",
      "course_code": "SE301",
      "course_title": "Software Architecture",
      "present_count": 3,
      "absent_count": 0,
      "total_sessions": 3,
      "percentage": 100,
      "warning_active": false
    }
  ]
}
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Dynamic `absence_warning_threshold` from institutional settings. Handled in `student-engagement-handlers.js`, verified in `sc-6-attendance-absence-warning`.

---

### 3.11 Student To-Do Tasks List
Lists personal to-do tasks for the authenticated student.

- **Method / Path:** `GET /student/todos`
- **Allowed Roles:** `student`
- **Response `200 OK`:**
```json
[
  {
    "id": "todo-1",
    "title": "Review Hexagonal Architecture notes",
    "completed": false,
    "course_id": "crs-a",
    "due_date": "2026-11-28",
    "priority": "high"
  }
]
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Private to the authenticated student. Handled in `student-engagement-handlers.js`, verified in `sc-10-todo-ownership-crud`.

---

### 3.12 Create Student To-Do Task
Creates a new personal to-do item.

- **Method / Path:** `POST /student/todos`
- **Allowed Roles:** `student`
- **Request Body:**
```json
{
  "title": "Complete quiz preparation",
  "due_date": "2026-11-29",
  "priority": "medium",
  "course_id": "crs-a"
}
```
  - `title` (string, required)
  - `due_date` (string `YYYY-MM-DD`, optional)
  - `priority` (string: `"low"|"medium"|"high"`, optional, default `"medium"`)
  - `course_id` (string, optional)
- **Response `201 Created`:** The created to-do object with `id` and `completed: false`.
- **Error Statuses:**
  - `422 Unprocessable Entity`: Title missing or invalid date.
- **Business Rule & Source:** Handled in `student-engagement-handlers.js`, verified in `sc-10-todo-ownership-crud`.

---

### 3.13 Update Student To-Do Task
Updates an existing student to-do item or toggles completion.

- **Method / Path:** `PATCH /student/todos/{todo_id}`
- **Allowed Roles:** `student`
- **Path Parameters:** `todo_id` (string, required)
- **Request Body:** Partial object containing `title`, `completed`, `due_date`, or `priority`.
- **Response `200 OK`:** Updated to-do object.
- **Error Statuses:**
  - `403 Forbidden`: Attempting to edit another student’s task.
  - `404 Not Found`: Task does not exist.
  - `422 Unprocessable Entity`: Validation failure.
- **Business Rule & Source:** Strict owner isolation. Handled in `student-engagement-handlers.js`, verified in `sc-10-todo-ownership-crud`.

---

### 3.14 Delete Student To-Do Task
Deletes a student to-do task.

- **Method / Path:** `DELETE /student/todos/{todo_id}`
- **Allowed Roles:** `student`
- **Path Parameters:** `todo_id` (string, required)
- **Response `204 No Content`**
- **Error Statuses:** `403`, `404`.
- **Business Rule & Source:** Owner isolation. Handled in `student-engagement-handlers.js`, verified in `sc-10-todo-ownership-crud`.

---

### 3.15 Gamification Points & Monthly Ledger
Retrieves current monthly points, rank, reset date, and earning ledger.

- **Method / Path:** `GET /student/points`
- **Allowed Roles:** `student`
- **Response `200 OK`:**
```json
{
  "current_points": 110,
  "rank": 1,
  "month": "2026-10",
  "reset_date": "2026-11-01",
  "ledger": [
    { "id": "pts-1", "source": "submission", "points": 50, "description": "On-time submission: SE301", "created_at": "2026-10-14T14:20:00Z" }
  ]
}
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Resets monthly. September entries excluded from October total. Handled in `student-engagement-handlers.js`, verified in `sc-8-points-monthly-ledger`.

---

### 3.16 Learning Roadmaps (PROVISIONAL)
Retrieves curriculum tracks and milestone progression.

- **Method / Path:** `GET /student/roadmaps`
- **Allowed Roles:** `student`
- **Response `200 OK`:** Array of roadmaps with steps and completion statuses.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Read-only provisional logic. Handled in `student-engagement-handlers.js`.

---

### 3.17 Student Inbox Messages
Retrieves incoming messages delivered to the authenticated student, newest first.

- **Method / Path:** `GET /student/inbox`
- **Allowed Roles:** `student`
- **Response `200 OK`:** Array of inbox message objects (`id`, `sender_name`, `type`, `subject`, `body`, `created_at`, `is_read`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Only messages where `recipient_id === user.id`. Handled in `student-engagement-handlers.js`, verified in `sc-7-doctor-messages-inbox`.

---

### 3.18 Student Inbox Unread Count
Returns the count of unread messages for the sidebar badge.

- **Method / Path:** `GET /student/inbox/unread-count`
- **Allowed Roles:** `student`
- **Response `200 OK`:** `{"unread_count": 3}`
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `student-engagement-handlers.js`, verified in `sc-7-doctor-messages-inbox`.

---

### 3.19 Mark Student Message Read
Marks an inbox message as read.

- **Method / Path:** `PUT /student/inbox/{message_id}/read`
- **Allowed Roles:** `student`
- **Path Parameters:** `message_id` (string, required)
- **Response `200 OK`:** `{"message": "Marked as read."}`
- **Error Statuses:**
  - `404 Not Found`: Message not found or belongs to another student.
- **Business Rule & Source:** Decrements unread count. Handled in `student-engagement-handlers.js`, verified in `sc-7-doctor-messages-inbox`.

---

### 3.20 Student Profile
Retrieves personal profile details for the authenticated student.

- **Method / Path:** `GET /student/profile`
- **Allowed Roles:** `student`
- **Response `200 OK`:**
```json
{
  "id": "usr-1",
  "full_name": "Karim Adel",
  "email": "student@aplus.edu",
  "university_id": "CS2023001",
  "level": "3",
  "department": "Computer Science",
  "role": "student"
}
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `student-engagement-handlers.js`, verified in `sc-19-shell-navigation-integrity`.

---

### 3.21 Submit Anonymous Rating
Submits anonymous numerical rating and optional review for a lecture or doctor.

- **Method / Path:** `POST /student/ratings`
- **Allowed Roles:** `student`
- **Request Body:**
```json
{
  "target_type": "doctor",
  "target_id": "usr-6",
  "course_id": "crs-a",
  "score": 5,
  "comment": "Exceptional teaching."
}
```
  - `target_type` (string, required: `"lecture"|"doctor"`)
  - `target_id` (string, required)
  - `course_id` (string, required)
  - `score` (integer, required: `1–5`)
  - `comment` (string, optional)
- **Response `201 Created`:** `{"message": "Rating submitted successfully."}`
- **Error Statuses:**
  - `403 Forbidden`: Not enrolled in course.
  - `422 Unprocessable Entity`: Invalid score (not 1–5) or missing required fields.
  - `429 Too Many Requests`: Rating submitted within `rating_cooldown_days`.
- **Business Rule & Source:** Strict anonymity. Stored without student identity exposed in doctor or dean aggregations. Handled in `student-engagement-handlers.js`, verified in `sc-9-ratings-anonymity-cooldown`.

---

## 4. Doctor Domain Endpoints

### 4.1 Doctor Dashboard Summary
Retrieves aggregate metrics and counters for the doctor dashboard.

- **Method / Path:** `GET /doctor/dashboard/summary`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:**
```json
{
  "active_courses_count": 2,
  "pending_submissions_to_grade": 2,
  "students_near_absence_limit": 1,
  "total_enrolled_students": 4,
  "average_student_rating": 4.5
}
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Aggregates doctor-owned courses. Handled in `doctor-academic-handlers.js`, verified in `sc-11-dashboard-aggregates`.

---

### 4.2 Doctor Courses List
Lists all courses instructed by the authenticated doctor.

- **Method / Path:** `GET /doctor/courses`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** Array of course objects (`id`, `code`, `title`, `department`, `enrolled_count`, `completed_lectures`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Scoped strictly by `doctor_id`. Handled in `doctor-academic-handlers.js`, verified in `sc-2b-cross-doctor-isolation`.

---

### 4.3 Doctor Course Detail
Retrieves detail for a specific doctor-owned course including lecture schedule.

- **Method / Path:** `GET /doctor/courses/{course_id}`
- **Allowed Roles:** `doctor`
- **Path Parameters:** `course_id` (string, required)
- **Response `200 OK`:** Course object with `lectures` array.
- **Error Statuses:**
  - `404 Not Found`: Course not found or instructed by another doctor.
- **Business Rule & Source:** Isolation enforced. Handled in `doctor-academic-handlers.js`, verified in `sc-2b-cross-doctor-isolation`.

---

### 4.4 Doctor Pending Submissions Count
Returns count of unreviewed submissions across all doctor courses (powers sidebar badge).

- **Method / Path:** `GET /doctor/assignments/pending-count`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** `{"pending_count": 2}`
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`, verified in `sc-4-doctor-grading-flow`.

---

### 4.5 Doctor Assignments List
Retrieves all assignments across doctor-owned courses with submission breakdown.

- **Method / Path:** `GET /doctor/assignments`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** Array of assignment objects including submissions list.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`, verified in `sc-2-assignment-creation-visibility`.

---

### 4.6 Doctor Create Assignment
Creates a new assignment in a doctor-owned course.

- **Method / Path:** `POST /doctor/assignments`
- **Allowed Roles:** `doctor`
- **Request Body:**
```json
{
  "course_id": "crs-a",
  "title": "Assignment 3: Microservices Refactoring",
  "description": "Deconstruct the auth module into a standalone service.",
  "due_date": "2027-01-15T23:59:00Z",
  "max_grade": 20
}
```
  - `course_id` (string, required): Must belong to authenticated doctor.
  - `title` (string, required)
  - `description` (string, optional)
  - `due_date` (ISO date string, optional)
  - `max_grade` (number > 0, optional, default `20`)
- **Response `201 Created`:** Created assignment object.
- **Error Statuses:**
  - `403 Forbidden`: Attempting to create an assignment in another doctor’s course.
  - `422 Unprocessable Entity`: Validation failure on title or max_grade.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`, verified in `sc-2-assignment-creation-visibility`.

---

### 4.7 Doctor Update Assignment
Updates title, description, due date, or max grade for a doctor-owned assignment.

- **Method / Path:** `PATCH /doctor/assignments/{assignment_id}`
- **Allowed Roles:** `doctor`
- **Path Parameters:** `assignment_id` (string, required)
- **Request Body:** Partial object (`title`, `description`, `due_date`, `max_grade`).
- **Response `200 OK`:** Updated assignment object.
- **Error Statuses:**
  - `403 Forbidden`: Assignment belongs to another doctor.
  - `404 Not Found`: Assignment does not exist.
  - `422 Unprocessable Entity`: Invalid title or max_grade <= 0.
- **Business Rule & Source:** Course ownership enforced; cannot transfer courses. Handled in `doctor-academic-handlers.js`, verified in `sc-2b-cross-doctor-isolation`.

---

### 4.8 Doctor Create Lecture
Adds a lecture to a doctor-owned course.

- **Method / Path:** `POST /doctor/lectures`
- **Allowed Roles:** `doctor`
- **Request Body:**
```json
{
  "course_id": "crs-a",
  "number": 4,
  "title": "Clean Architecture & CQRS",
  "date": "2026-11-28",
  "material_url": "https://materials.aplus.edu/lec4.pdf"
}
```
- **Response `201 Created`:** Created lecture object with assigned ID.
- **Error Statuses:**
  - `403 Forbidden`: Course not owned by doctor.
  - `422 Unprocessable Entity`: Missing title or course_id.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`.

---

### 4.9 Doctor Update Lecture
Updates metadata for a lecture belonging to the doctor.

- **Method / Path:** `PATCH /doctor/lectures/{lecture_id}`
- **Allowed Roles:** `doctor`
- **Path Parameters:** `lecture_id` (string, required)
- **Request Body:** Partial object (`title`, `number`, `date`, `material_url`).
- **Response `200 OK`:** Updated lecture object.
- **Error Statuses:** `403`, `404`, `422`.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`.

---

### 4.10 Grade Submission
Posts doctor final grade and feedback for a student submission.

- **Method / Path:** `POST /doctor/submissions/{submission_id}/grade`
- **Allowed Roles:** `doctor`
- **Path Parameters:** `submission_id` (string, required)
- **Request Body:**
```json
{
  "final_grade": 18,
  "doctor_feedback": "Strong architecture with clean port abstraction."
}
```
  - `final_grade` (number, required: `0 <= final_grade <= max_grade`)
  - `doctor_feedback` (string, optional)
- **Response `200 OK`:** Updated submission object.
- **Error Statuses:**
  - `403 Forbidden`: Submission is for a course instructed by another doctor.
  - `404 Not Found`: Submission does not exist.
  - `422 Unprocessable Entity`: `{"details": {"final_grade": "Grade must be between 0 and 20."}}`.
- **Business Rule & Source:** Dispatches grade notification message to student inbox. Handled in `doctor-academic-handlers.js`, verified in `sc-4-doctor-grading-flow`.

---

### 4.11 Doctor Quizzes List
Lists all quizzes created in doctor-owned courses.

- **Method / Path:** `GET /doctor/quizzes`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** Array of quiz objects with attempt statistics.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`, verified in `sc-5-quiz-lifecycle`.

---

### 4.12 Doctor Quiz Results
Retrieves student attempt logs and scores for a doctor-owned quiz.

- **Method / Path:** `GET /doctor/quizzes/{quiz_id}/results`
- **Allowed Roles:** `doctor`
- **Path Parameters:** `quiz_id` (string, required)
- **Response `200 OK`:** `{"attempts": [{"student_name": "Karim Adel", "submitted_at": "...", "score": 20, "total": 20}]}`
- **Error Statuses:** `403`, `404`.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`, verified in `sc-5-quiz-lifecycle`.

---

### 4.13 Doctor Create Quiz
Creates a new quiz in a doctor-owned course.

- **Method / Path:** `POST /doctor/quizzes`
- **Allowed Roles:** `doctor`
- **Request Body:**
```json
{
  "course_id": "crs-a",
  "title": "Quiz 2: Domain-Driven Design",
  "duration_minutes": 25,
  "available_from": "2026-12-01T08:00:00Z",
  "available_to": "2026-12-01T20:00:00Z",
  "questions": [
    {
      "id": "q1",
      "text": "What is an aggregate root?",
      "options": ["Entity that controls access", "Database table", "Service class"],
      "correct_index": 0,
      "points": 5
    }
  ]
}
```
- **Response `201 Created`:** Created quiz object.
- **Error Statuses:** `403`, `422`.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`, verified in `sc-5-quiz-lifecycle`.

---

### 4.14 Doctor Update Quiz
Updates quiz configuration while retaining course scope.

- **Method / Path:** `PATCH /doctor/quizzes/{quiz_id}`
- **Allowed Roles:** `doctor`
- **Path Parameters:** `quiz_id` (string, required)
- **Request Body:** Partial object (`title`, `duration_minutes`, `available_from`, `available_to`, `questions`).
- **Response `200 OK`:** Updated quiz object.
- **Error Statuses:** `403`, `404`, `422`.
- **Business Rule & Source:** Handled in `doctor-academic-handlers.js`, verified in `sc-5-quiz-lifecycle`.

---

### 4.15 Doctor Attendance Sessions
Retrieves attendance session history for doctor-owned courses.

- **Method / Path:** `GET /doctor/attendance`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** Array of sessions with attended / absent counts.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `doctor-engagement-handlers.js`, verified in `sc-6-attendance-absence-warning`.

---

### 4.16 Record Attendance Session
Records student attendance for a lecture session. Triggers automated Absence Warnings if threshold reached.

- **Method / Path:** `POST /doctor/attendance`
- **Allowed Roles:** `doctor`
- **Request Body:**
```json
{
  "course_id": "crs-a",
  "lecture_id": "lec-a1",
  "date": "2026-11-24",
  "method": "manual",
  "records": [
    { "student_id": "usr-1", "status": "present" },
    { "student_id": "usr-2", "status": "absent" }
  ]
}
```
  - `course_id` (string, required)
  - `date` (string `YYYY-MM-DD`, required)
  - `records` (array of objects: `student_id`, `status: "present"|"absent"`, required)
- **Response `201 Created`:** Summary of session with `session_id`.
- **Error Statuses:**
  - `403 Forbidden`: Course not owned by doctor or student not enrolled.
  - `422 Unprocessable Entity`: Missing fields or invalid date format.
- **Business Rule & Source:** Awards `points_attendance_present` to present students; dispatches Absence Warning to any student reaching `absence_warning_threshold`. Handled in `doctor-engagement-handlers.js`, verified in `sc-6-attendance-absence-warning`.

---

### 4.17 Doctor Student Roster
Lists all students enrolled in doctor-owned courses with grades, attendance, and monthly points.

- **Method / Path:** `GET /doctor/students`
- **Allowed Roles:** `doctor`
- **Query Parameters:** `course_id` (string, optional)
- **Response `200 OK`:** Array of student roster rows with `current_month_points`.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Scoped to enrolled students. Handled in `doctor-engagement-handlers.js`, verified in `sc-11-dashboard-aggregates`.

---

### 4.18 Grant Bonus Points
Awards discretionary bonus points to an enrolled student for exemplary performance.

- **Method / Path:** `POST /doctor/students/{student_id}/bonus`
- **Allowed Roles:** `doctor`
- **Path Parameters:** `student_id` (string, required)
- **Request Body:**
```json
{
  "points": 25,
  "reason": "Outstanding project defense and architecture presentation."
}
```
  - `points` (integer, required: `1–100`)
  - `reason` (string, required)
- **Response `200 OK`:** `{"message": "Bonus points granted.", "new_total": 135}`
- **Error Statuses:**
  - `403 Forbidden`: Student not enrolled in any course instructed by this doctor.
  - `422 Unprocessable Entity`: Invalid points value.
- **Business Rule & Source:** Directly increments current monthly points ledger. Handled in `doctor-engagement-handlers.js`, verified in `sc-8-points-monthly-ledger`.

---

### 4.19 Doctor Sent Messages
Lists all broadcast and direct messages sent by the doctor.

- **Method / Path:** `GET /doctor/messages`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** Array of sent message objects.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `doctor-engagement-handlers.js`, verified in `sc-7-doctor-messages-inbox`.

---

### 4.20 Doctor Send Message
Sends an announcement or targeted alert to students in doctor-owned courses.

- **Method / Path:** `POST /doctor/messages`
- **Allowed Roles:** `doctor`
- **Request Body:**
```json
{
  "course_id": "crs-a",
  "recipient_ids": ["usr-1", "usr-2"],
  "type": "notice",
  "subject": "Lab Session Location Change",
  "body": "Tomorrow lab session is moved to Lab 204."
}
```
  - `course_id` (string, required)
  - `recipient_ids` (array of strings, optional; if omitted or empty, broadcasts to all enrolled students)
  - `type` (string, required: `"notice"|"warning"|"suggestion"`)
  - `subject` (string, required)
  - `body` (string, required)
- **Response `201 Created`:** `{"sent_count": 2}`
- **Error Statuses:**
  - `403 Forbidden`: Course not owned by doctor.
  - `422 Unprocessable Entity`: Invalid message type or empty text.
- **Business Rule & Source:** Delivers unread message into each recipient student’s inbox. Handled in `doctor-engagement-handlers.js`, verified in `sc-7-doctor-messages-inbox`.

---

### 4.21 Doctor Inbox
Lists messages received by the doctor (e.g. from department admin or dean).

- **Method / Path:** `GET /doctor/inbox`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** Array of received message objects, newest first. Doctor own sent messages never appear here.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Only messages where `recipient_id === doctor.id`. Handled in `doctor-engagement-handlers.js`, verified in `sc-28-admin-doctor-inbox-delivery`.

---

### 4.22 Doctor Inbox Unread Count
Returns count of unread incoming messages for the doctor sidebar badge.

- **Method / Path:** `GET /doctor/inbox/unread-count`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** `{"unread_count": 1}`
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `doctor-engagement-handlers.js`, verified in `sc-28-admin-doctor-inbox-delivery`.

---

### 4.23 Mark Doctor Message Read
Marks a doctor inbox message as read.

- **Method / Path:** `PUT /doctor/inbox/{message_id}/read`
- **Allowed Roles:** `doctor`
- **Path Parameters:** `message_id` (string, required)
- **Response `200 OK`:** `{"message": "Marked as read."}`
- **Error Statuses:**
  - `404 Not Found`: Message does not exist or was sent to another doctor.
- **Business Rule & Source:** Doctor A cannot mark or view Doctor B’s message. Handled in `doctor-engagement-handlers.js`, verified in `sc-28-admin-doctor-inbox-delivery`.

---

### 4.24 Doctor Ratings & Feedback
Retrieves anonymous aggregated ratings and comments for the authenticated doctor.

- **Method / Path:** `GET /doctor/ratings`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:**
```json
{
  "overall_score": 4.5,
  "total_evaluations": 6,
  "breakdown": [
    { "metric": "Overall Doctor Rating", "score": 4.6 },
    { "metric": "Lecture Quality", "score": 4.4 }
  ],
  "anonymous_comments": [
    { "course_code": "SE301", "date": "2026-10-13", "score": 5, "comment": "Clear explanations." }
  ]
}
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Student identities (`student_id`, `student_name`) are strictly omitted. Handled in `doctor-engagement-handlers.js`, verified in `sc-9-ratings-anonymity-cooldown`.

---

### 4.25 Doctor Profile
Retrieves personal profile details for the authenticated doctor.

- **Method / Path:** `GET /doctor/profile`
- **Allowed Roles:** `doctor`
- **Response `200 OK`:** Doctor profile object (`id`, `full_name`, `email`, `university_id`, `department`, `role`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `doctor-engagement-handlers.js`, verified in `sc-19-shell-navigation-integrity`.

---

## 5. Department Administrator Domain Endpoints

### 5.1 Admin Dashboard Summary
Retrieves department-level executive academic summary and counters.

- **Method / Path:** `GET /admin/dashboard/summary`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:**
```json
{
  "dept_name": "Computer Science",
  "student_count": 5,
  "doctor_count": 2,
  "course_count": 3,
  "avg_attendance_rate": 88.9,
  "at_risk_students": [
    { "id": "usr-3", "full_name": "Yara Ibrahim", "course_code": "SE301", "absence_count": 2 }
  ],
  "top_students": [
    { "id": "usr-1", "full_name": "Karim Adel", "points": 110, "rank": 1 }
  ]
}
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Scoped strictly to the administrator’s own department. Handled in `admin-account-handlers.js`, verified in `sc-20-admin-metrics-attendance-points`.

---

### 5.2 Admin Students List
Lists all students belonging to the administrator’s department.

- **Method / Path:** `GET /admin/students`
- **Allowed Roles:** `department_admin`
- **Query Parameters:** `course_id` (string, optional: filters students enrolled in course).
- **Response `200 OK`:** Array of student objects (`id`, `full_name`, `email`, `university_id`, `level`, `disabled`, `enrolled_courses`).
- **Error Statuses:**
  - `403 Forbidden`: `course_id` belongs to another department.
- **Business Rule & Source:** Cross-department isolation. Handled in `admin-account-handlers.js`, verified in `sc-14-admin-scope-students` and `sc-24-admin-student-level`.

---

### 5.3 Admin Create Student
Provisions a new student account in the department and returns a one-time temporary password.

- **Method / Path:** `POST /admin/students`
- **Allowed Roles:** `department_admin`
- **Request Body:**
```json
{
  "full_name": "Mostafa Tarek",
  "email": "mostafa@aplus.edu",
  "university_id": "CS2026001",
  "level": "1"
}
```
  - `full_name` (string, required)
  - `email` (string, required: unique across entire institution)
  - `university_id` (string, required: unique across entire institution)
  - `level` (string, required: `"1"|"2"|"3"|"4"|"5"`)
- **Response `201 Created`:**
```json
{
  "student": { "id": "usr-99", "full_name": "Mostafa Tarek", "email": "mostafa@aplus.edu", "university_id": "CS2026001", "level": "1", "disabled": false },
  "temp_password": "Aplus4921!"
}
```
- **Error Statuses:**
  - `409 Conflict`: Email or university ID already taken.
  - `422 Unprocessable Entity`: Missing fields or invalid level outside 1–5.
- **Business Rule & Source:** Temporary password generated once. Handled in `admin-account-handlers.js`, verified in `sc-14-admin-scope-students` and `sc-24-admin-student-level`.

---

### 5.4 Admin Update Student
Updates name, email, university ID, or academic level for a department student.

- **Method / Path:** `PATCH /admin/students/{student_id}`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `student_id` (string, required)
- **Request Body:** Partial object (`full_name`, `email`, `university_id`, `level`).
- **Response `200 OK`:** Updated student record.
- **Error Statuses:**
  - `403 Forbidden`: Student belongs to another department.
  - `404 Not Found`: Student does not exist.
  - `409 Conflict`: New email or university ID already in use.
  - `422 Unprocessable Entity`: Invalid level format.
- **Business Rule & Source:** Handled in `admin-account-handlers.js`, verified in `sc-14-admin-scope-students`.

---

### 5.5 Deactivate Student Account
Disables a student account. Account is immediately blocked from logging in (403).

- **Method / Path:** `POST /admin/students/{student_id}/deactivate`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `student_id` (string, required)
- **Response `200 OK`:** `{"message": "Student account deactivated.", "disabled": true}`
- **Error Statuses:** `403`, `404`.
- **Business Rule & Source:** Handled in `admin-account-handlers.js`, verified in `sc-14-admin-scope-students`.

---

### 5.6 Reactivate Student Account
Restores access for a previously deactivated student account.

- **Method / Path:** `POST /admin/students/{student_id}/reactivate`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `student_id` (string, required)
- **Response `200 OK`:** `{"message": "Student account reactivated.", "disabled": false}`
- **Error Statuses:** `403`, `404`.
- **Business Rule & Source:** Handled in `admin-account-handlers.js`, verified in `sc-14-admin-scope-students`.

---

### 5.7 Admin Doctors List
Lists all faculty doctors assigned to the administrator’s department.

- **Method / Path:** `GET /admin/doctors`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** Array of doctor objects (`id`, `full_name`, `email`, `university_id`, `disabled`, `courses`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Scoped to department. Handled in `admin-account-handlers.js`, verified in `sc-14-admin-scope-students`.

---

### 5.8 Admin Create Doctor
Provisions a new doctor account in the department with a one-time temporary password.

- **Method / Path:** `POST /admin/doctors`
- **Allowed Roles:** `department_admin`
- **Request Body:**
```json
{
  "full_name": "Dr. Hazem Fikry",
  "email": "hazem@aplus.edu",
  "university_id": "DR2026001"
}
```
- **Response `201 Created`:** Created doctor record with `temp_password`.
- **Error Statuses:** `409 Conflict`, `422 Unprocessable Entity`.
- **Business Rule & Source:** Handled in `admin-account-handlers.js`, verified in `sc-14-admin-scope-students`.

---

### 5.9 Admin Update Doctor
Updates name, email, or university ID for a department doctor.

- **Method / Path:** `PATCH /admin/doctors/{doctor_id}`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `doctor_id` (string, required)
- **Request Body:** Partial object (`full_name`, `email`, `university_id`).
- **Response `200 OK`:** Updated doctor record.
- **Error Statuses:** `403`, `404`, `409`.
- **Business Rule & Source:** Handled in `admin-account-handlers.js`.

---

### 5.10 Deactivate Doctor Account
Deactivates a doctor account.

- **Method / Path:** `POST /admin/doctors/{doctor_id}/deactivate`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `doctor_id` (string, required)
- **Response `200 OK`:** `{"message": "Doctor account deactivated.", "disabled": true}`
- **Error Statuses:** `403`, `404`.
- **Business Rule & Source:** Handled in `admin-account-handlers.js`.

---

### 5.11 Reactivate Doctor Account
Reactivates a doctor account.

- **Method / Path:** `POST /admin/doctors/{doctor_id}/reactivate`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `doctor_id` (string, required)
- **Response `200 OK`:** `{"message": "Doctor account reactivated.", "disabled": false}`
- **Error Statuses:** `403`, `404`.
- **Business Rule & Source:** Handled in `admin-account-handlers.js`.

---

### 5.12 Admin Courses List
Lists all courses managed under the administrator’s department.

- **Method / Path:** `GET /admin/courses`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** Array of course records with assigned doctor and enrolled student counts.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Scoped to department. Handled in `admin-operations-handlers.js`, verified in `sc-15-admin-course-enrollment`.

---

### 5.13 Admin Create Course
Creates an academic course within the department and assigns a department doctor.

- **Method / Path:** `POST /admin/courses`
- **Allowed Roles:** `department_admin`
- **Request Body:**
```json
{
  "code": "CS402",
  "title": "Distributed Systems",
  "doctor_id": "usr-6",
  "credit_hours": 3,
  "total_lectures": 12,
  "schedule": "Mon & Wed 14:00–15:30",
  "room": "Hall 2B",
  "color": "#16a34a"
}
```
- **Response `201 Created`:** Created course object.
- **Error Statuses:**
  - `409 Conflict`: Course code already exists.
  - `422 Unprocessable Entity`: Doctor does not belong to department or missing fields.
- **Business Rule & Source:** Assigned doctor must belong to the same department. Handled in `admin-operations-handlers.js`, verified in `sc-15-admin-course-enrollment`.

---

### 5.14 Admin Update Course
Updates course title, schedule, room, color, or reassigns to another department doctor.

- **Method / Path:** `PATCH /admin/courses/{course_id}`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `course_id` (string, required)
- **Request Body:** Partial object (`title`, `doctor_id`, `schedule`, `room`, `color`, `credit_hours`).
- **Response `200 OK`:** Updated course object.
- **Error Statuses:**
  - `403 Forbidden`: Course belongs to another department.
  - `404 Not Found`: Course does not exist.
  - `422 Unprocessable Entity`: Doctor does not belong to this department.
- **Business Rule & Source:** Handled in `admin-operations-handlers.js`, verified in `sc-15-admin-course-enrollment`.

---

### 5.15 Enroll Student in Course
Enrolls a department student into a department course.

- **Method / Path:** `POST /admin/courses/{course_id}/enroll`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `course_id` (string, required)
- **Request Body:** `{"student_id": "usr-1"}`
- **Response `201 Created`:** `{"enrollment": {"id": "enr-...", "student_id": "usr-1", "course_id": "crs-a"}}`
- **Error Statuses:**
  - `403 Forbidden`: Course or student belongs to another department.
  - `404 Not Found`: Course or student not found.
  - `409 Conflict`: Student already enrolled.
  - `422 Unprocessable Entity`: Student ID missing.
- **Business Rule & Source:** Both course and student must belong to the administrator’s department. Handled in `admin-operations-handlers.js`, verified in `sc-15-admin-course-enrollment`.

---

### 5.16 Unenroll Student from Course
Removes a student’s enrollment from a course.

- **Method / Path:** `DELETE /admin/courses/{course_id}/enroll/{student_id}`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `course_id` (string, required), `student_id` (string, required)
- **Response `204 No Content`**
- **Error Statuses:**
  - `403 Forbidden`: Course or student outside department scope.
  - `404 Not Found`: Enrollment record not found.
- **Business Rule & Source:** Handled in `admin-operations-handlers.js`, verified in `sc-15-admin-course-enrollment`.

---

### 5.17 Admin Attendance Overview
Retrieves attendance summaries and at-risk counts per course in the department.

- **Method / Path:** `GET /admin/attendance`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** Array of course summaries with `avg_attendance_rate` and `at_risk_count`.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Scoped to department courses. Uses dynamic `absence_warning_threshold`. Handled in `admin-operations-handlers.js`, verified in `sc-20-admin-metrics-attendance-points`.

---

### 5.18 Admin Department Points Leaderboard
Retrieves monthly points leaderboard for all active students in the department.

- **Method / Path:** `GET /admin/points`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** Array of ranked students (`rank`, `student_id`, `full_name`, `points`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Excludes students from other departments. Handled in `admin-operations-handlers.js`, verified in `sc-20-admin-metrics-attendance-points`.

---

### 5.19 Admin Sent Messages
Lists broadcast records dispatched by the department administrator.

- **Method / Path:** `GET /admin/messages`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** Array of broadcast records including `recipient_count`, `audience`, `subject`, `created_at`.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `admin-operations-handlers.js`, verified in `sc-21-admin-messages-inbox`.

---

### 5.20 Admin Send Message
Sends targeted broadcasts to department students, doctors, both, a course, or the college Dean.

- **Method / Path:** `POST /admin/messages`
- **Allowed Roles:** `department_admin`
- **Request Body:**
```json
{
  "recipient_type": "students",
  "course_id": "crs-a",
  "type": "notice",
  "subject": "Final Examination Schedule",
  "body": "The final examination schedule has been officially published."
}
```
  - `recipient_type` (string, required: `"students"|"doctors"|"both"|"course"|"dean"`)
  - `course_id` (string, required if `recipient_type === "course"`)
  - `type` (string, optional: `"notice"|"warning"|"suggestion"`, default `"notice"`)
  - `subject` (string, required)
  - `body` (string, required)
- **Response `201 Created`:** `{"sent_count": 5}`
- **Error Statuses:**
  - `403 Forbidden`: Targeting a course belonging to another department.
  - `422 Unprocessable Entity`: Missing subject or body.
- **Business Rule & Source:** Creates unread message for each matching recipient. Targeting `"dean"` delivers to `super_admin`. Handled in `admin-operations-handlers.js`, verified in `sc-21-admin-messages-inbox` and `sc-29-dean-messaging-and-inbox`.

---

### 5.21 Admin Read Settings
Retrieves current institutional policies and thresholds (read-only for admins).

- **Method / Path:** `GET /admin/settings`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** Institutional settings object.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Department administrators cannot update settings (`PATCH /dean/settings` returns 403). Handled in `admin-operations-handlers.js`, verified in `sc-22-admin-settings-authorization`.

---

### 5.22 Admin Inbox
Lists messages received by the administrator (e.g. from the Dean).

- **Method / Path:** `GET /admin/inbox`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** Array of received message objects, newest first.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Only messages where `recipient_id === admin.id`. Handled in `admin-operations-handlers.js`, verified in `sc-21-admin-messages-inbox`.

---

### 5.23 Admin Inbox Unread Count
Returns count of unread incoming messages for the administrator sidebar badge.

- **Method / Path:** `GET /admin/inbox/unread-count`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** `{"unread_count": 1}`
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `admin-operations-handlers.js`, verified in `sc-21-admin-messages-inbox`.

---

### 5.24 Mark Admin Message Read
Marks an incoming admin message as read.

- **Method / Path:** `PUT /admin/inbox/{message_id}/read`
- **Allowed Roles:** `department_admin`
- **Path Parameters:** `message_id` (string, required)
- **Response `200 OK`:** `{"message": "Marked as read."}`
- **Error Statuses:**
  - `404 Not Found`: Message not found or sent to another user.
- **Business Rule & Source:** Decrements unread badge. Handled in `admin-operations-handlers.js`, verified in `sc-21-admin-messages-inbox`.

---

### 5.25 Admin Profile
Retrieves personal profile details for the department administrator.

- **Method / Path:** `GET /admin/profile`
- **Allowed Roles:** `department_admin`
- **Response `200 OK`:** Profile object (`id`, `full_name`, `email`, `university_id`, `department`, `role`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `profile-handlers.js`, verified in `sc-19-shell-navigation-integrity`.

---

## 6. College Dean (Super Admin) Domain Endpoints

### 6.1 Dean Overview Summary
Retrieves college-wide executive summary and department comparison stats.

- **Method / Path:** `GET /dean/overview/summary`
- **Allowed Roles:** `super_admin`
- **Response `200 OK`:**
```json
{
  "dept_count": 2,
  "total_students": 7,
  "total_doctors": 3,
  "total_courses": 5,
  "college_avg_attendance": 88.9,
  "college_avg_grade": 17.0,
  "departments": [
    { "id": "dept-1", "name": "Computer Science", "code": "CS", "student_count": 5, "doctor_count": 2, "course_count": 3, "avg_attendance_rate": 88.9 }
  ]
}
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Exposes no student identities or AI scores. Handled in `dean-handlers.js`, verified in `sc-16-dean-departments-overview` and `sc-27-dean-response-privacy-scan`.

---

### 6.2 Dean Departments List
Retrieves all academic departments with assigned administrators and metrics.

- **Method / Path:** `GET /dean/departments`
- **Allowed Roles:** `super_admin`
- **Response `200 OK`:** Array of department records (`id`, `name`, `code`, `student_count`, `doctor_count`, `course_count`, `admin`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `dean-handlers.js`, verified in `sc-16-dean-departments-overview`.

---

### 6.3 Dean Create Department & Admin
Provisions a new academic department and its initial department administrator account.

- **Method / Path:** `POST /dean/departments`
- **Allowed Roles:** `super_admin`
- **Request Body:**
```json
{
  "name": "Artificial Intelligence",
  "code": "AI",
  "admin_full_name": "Dr. Sami Mansour",
  "admin_email": "sami@aplus.edu",
  "admin_university_id": "ADM2026001"
}
```
  - `name` (string, required)
  - `code` (string, required: unique uppercase department code)
  - `admin_full_name` (string, required)
  - `admin_email` (string, required: unique across institution)
  - `admin_university_id` (string, required: unique)
- **Response `201 Created`:**
```json
{
  "department": { "id": "dept-3", "name": "Artificial Intelligence", "code": "AI", "college": "Faculty of Computing & Information Technology" },
  "admin": { "id": "usr-15", "full_name": "Dr. Sami Mansour", "email": "sami@aplus.edu", "university_id": "ADM2026001", "role": "department_admin" },
  "temp_password": "Aplus7182!"
}
```
- **Error Statuses:**
  - `409 Conflict`: Department code or admin email already registered.
  - `422 Unprocessable Entity`: Missing required fields.
- **Business Rule & Source:** Generates temporary password shown once. Handled in `dean-handlers.js`, verified in `sc-16-dean-departments-overview`.

---

### 6.4 Dean Department Detail
Retrieves comprehensive details for a specific department (read-only view).

- **Method / Path:** `GET /dean/departments/{department_id}`
- **Allowed Roles:** `super_admin`
- **Path Parameters:** `department_id` (string, required)
- **Response `200 OK`:** Object containing `dept_name`, `student_count`, `doctor_count`, `course_count`, `avg_attendance_rate`, `at_risk_students`, anonymous `top_students`, `doctors`, and `courses`.
- **Error Statuses:**
  - `404 Not Found`: Department does not exist.
- **Business Rule & Source:** Student names omitted from rankings; privacy preserved. Handled in `dean-handlers.js`, verified in `sc-16-dean-departments-overview` and `sc-27-dean-response-privacy-scan`.

---

### 6.5 Dean Analytics
Retrieves cross-department performance analytics with period filtering.

- **Method / Path:** `GET /dean/analytics`
- **Allowed Roles:** `super_admin`
- **Query Parameters:** `period` (string, optional: `"this_month"|"last_30_days"|"all_time"`, default `"all_time"`)
- **Response `200 OK`:**
```json
{
  "period": "all_time",
  "attendance_rate": 88.9,
  "submission_rate": 83.3,
  "average_grade": 17.0,
  "average_doctor_rating": 4.5,
  "doctor_rating_count": 6,
  "at_risk_count": 1,
  "departments": [
    {
      "department_id": "dept-1",
      "department_name": "Computer Science",
      "attendance_rate": 88.9,
      "submission_rate": 83.3,
      "average_grade": 17.0,
      "courses": [],
      "top_students": [
        { "month": "2026-10", "ranking": [{ "rank": 1, "points": 110 }] }
      ]
    }
  ],
  "needs_attention": [
    { "department_name": "Computer Science", "course_code": "SE301", "reasons": ["high_absence"] }
  ]
}
```
- **Error Statuses:**
  - `422 Unprocessable Entity`: Invalid period value.
- **Business Rule & Source:** Sum of department data matches college totals; zero student names or AI scores exposed. Handled in `dean-handlers.js`, verified in `sc-25-dean-analytics-reports` and `sc-27-dean-response-privacy-scan`.

---

### 6.6 Dean Reports (CSV-Ready Data)
Retrieves raw data tables for reporting and client-side CSV exports.

- **Method / Path:** `GET /dean/reports`
- **Allowed Roles:** `super_admin`
- **Query Parameters:** `period` (string, optional: `"this_month"|"last_30_days"|"all_time"`)
- **Response `200 OK`:**
```json
{
  "period": "all_time",
  "attendance": [
    { "department_id": "dept-1", "department_name": "Computer Science", "course_code": "SE301", "attendance_rate": 88.9, "at_risk_count": 1 }
  ],
  "submissions_and_grades": [
    { "department_id": "dept-1", "department_name": "Computer Science", "course_code": "SE301", "submission_rate": 83.3, "average_grade": 17.0 }
  ],
  "doctor_ratings": [
    { "department_id": "dept-1", "department_name": "Computer Science", "course_code": "SE301", "average_doctor_rating": 4.5, "doctor_rating_count": 6, "anonymous_comments": [] }
  ],
  "at_risk_students": [
    { "department_id": "dept-1", "department_name": "Computer Science", "course_code": "SE301", "absence_count": 2 }
  ]
}
```
- **Error Statuses:**
  - `422 Unprocessable Entity`: Invalid period.
- **Business Rule & Source:** Exposes no student identity. Comments remain anonymous. Handled in `dean-handlers.js`, verified in `sc-25-dean-analytics-reports`.

---

### 6.7 Dean Institutional Settings
Retrieves active institutional policy thresholds and points incentives.

- **Method / Path:** `GET /dean/settings`
- **Allowed Roles:** `super_admin`
- **Response `200 OK`:**
```json
{
  "absence_warning_threshold": 2,
  "rating_cooldown_days": 7,
  "points_submission_on_time": 50,
  "points_quiz_completion": 30,
  "points_attendance_present": 10,
  "updated_at": "2026-10-01T00:00:00Z",
  "updated_by": "usr-9"
}
```
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `dean-handlers.js`, verified in `sc-22-admin-settings-authorization`.

---

### 6.8 Dean Update Institutional Settings
Updates institutional thresholds and points incentives. Takes effect immediately.

- **Method / Path:** `PATCH /dean/settings`
- **Allowed Roles:** `super_admin`
- **Request Body:** Partial object containing numeric values:
  - `absence_warning_threshold` (integer: `1–20`)
  - `rating_cooldown_days` (integer: `1–365`)
  - `points_submission_on_time` (integer: `0–1000`)
  - `points_quiz_completion` (integer: `0–1000`)
  - `points_attendance_present` (integer: `0–1000`)
- **Response `200 OK`:** Updated settings object.
- **Error Statuses:**
  - `403 Forbidden`: Authenticated user is not `super_admin`.
  - `422 Unprocessable Entity`: Value out of permissible range.
- **Business Rule & Source:** Persisted values immediately modify subsequent attendance absence checks, rating submission cooldowns, and point increments. Handled in `dean-handlers.js`, verified in `sc-26-dean-settings-take-effect`.

---

### 6.9 Dean Sent Announcements
Retrieves all college-wide and broadcast announcements sent by the Dean.

- **Method / Path:** `GET /dean/messages`
- **Allowed Roles:** `super_admin`
- **Response `200 OK`:** Array of broadcast records (`id`, `scope`, `audience`, `subject`, `body`, `recipient_count`, `created_at`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `dean-handlers.js`, verified in `sc-29-dean-messaging-and-inbox`.

---

### 6.10 Dean Broadcast Announcement
Dispatches an announcement to college-wide, department, or course-specific audiences.

- **Method / Path:** `POST /dean/messages`
- **Allowed Roles:** `super_admin`
- **Request Body:**
```json
{
  "audience": "college",
  "department_id": null,
  "course_id": null,
  "type": "notice",
  "subject": "Fall Convocation Ceremony",
  "body": "The annual convocation ceremony will take place next month."
}
```
  - `audience` (string, required: `"college"|"all_students"|"all_doctors"|"department"|"dept_students"|"dept_doctors"|"course"`)
  - `department_id` (string, required if `audience` is department-scoped)
  - `course_id` (string, required if `audience === "course"`)
  - `type` (string, optional: `"notice"|"warning"|"suggestion"|"system"`, default `"notice"`)
  - `subject` (string, required)
  - `body` (string, required)
- **Response `201 Created`:** `{"sent_count": 12, "broadcast_id": "bcast-..."}`
- **Error Statuses:**
  - `404 Not Found`: Course not found if audience is course.
  - `422 Unprocessable Entity`: Missing department_id or course_id when required, or empty subject/body.
- **Business Rule & Source:** Creates unread message for every user in target audience with `sender_type: "dean"`. Handled in `dean-handlers.js`, verified in `sc-29-dean-messaging-and-inbox`.

---

### 6.11 Dean Inbox
Lists incoming messages sent to the Dean (e.g. from department administrators).

- **Method / Path:** `GET /dean/inbox`
- **Allowed Roles:** `super_admin`
- **Response `200 OK`:** Array of received message objects, newest first.
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `dean-handlers.js`, verified in `sc-29-dean-messaging-and-inbox`.

---

### 6.12 Dean Inbox Unread Count
Returns count of unread incoming messages for the Dean sidebar badge.

- **Method / Path:** `GET /dean/inbox/unread-count`
- **Allowed Roles:** `super_admin`
- **Response `200 OK`:** `{"unread_count": 1}`
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `dean-handlers.js`, verified in `sc-29-dean-messaging-and-inbox`.

---

### 6.13 Mark Dean Message Read
Marks an incoming Dean inbox message as read.

- **Method / Path:** `PUT /dean/inbox/{message_id}/read`
- **Allowed Roles:** `super_admin`
- **Path Parameters:** `message_id` (string, required)
- **Response `200 OK`:** `{"message": "Marked as read."}`
- **Error Statuses:**
  - `404 Not Found`: Message does not exist or was sent to another recipient.
- **Business Rule & Source:** Decrements unread count. Handled in `dean-handlers.js`, verified in `sc-29-dean-messaging-and-inbox`.

---

### 6.14 Dean Profile
Retrieves personal profile details for the Dean.

- **Method / Path:** `GET /dean/profile`
- **Allowed Roles:** `super_admin`
- **Response `200 OK`:** Profile object (`id`, `full_name`, `email`, `university_id`, `department`, `role`).
- **Error Statuses:** `401`, `403`.
- **Business Rule & Source:** Handled in `profile-handlers.js`, verified in `sc-19-shell-navigation-integrity` and `sc-27-dean-response-privacy-scan`.

---

## 7. Complete Route Inventory (86 Endpoints)

| Role | Method | Path |
|---|---|---|
| Public | POST | `/auth/login` |
| Student | GET | `/student/dashboard/summary` |
| Student | GET | `/student/courses` |
| Student | GET | `/student/courses/{course_id}` |
| Student | GET | `/student/assignments` |
| Student | GET | `/student/assignments/{assignment_id}` |
| Student | POST | `/student/assignments/{assignment_id}/submit` |
| Student | GET | `/student/quizzes` |
| Student | GET | `/student/quizzes/{quiz_id}` |
| Student | POST | `/student/quizzes/{quiz_id}/attempt` |
| Student | GET | `/student/attendance` |
| Student | GET | `/student/todos` |
| Student | POST | `/student/todos` |
| Student | PATCH | `/student/todos/{todo_id}` |
| Student | DELETE | `/student/todos/{todo_id}` |
| Student | GET | `/student/points` |
| Student | GET | `/student/roadmaps` |
| Student | GET | `/student/inbox` |
| Student | GET | `/student/inbox/unread-count` |
| Student | PUT | `/student/inbox/{message_id}/read` |
| Student | GET | `/student/profile` |
| Student | POST | `/student/ratings` |
| Doctor | GET | `/doctor/dashboard/summary` |
| Doctor | GET | `/doctor/courses` |
| Doctor | GET | `/doctor/courses/{course_id}` |
| Doctor | GET | `/doctor/assignments` |
| Doctor | GET | `/doctor/assignments/pending-count` |
| Doctor | POST | `/doctor/assignments` |
| Doctor | PATCH | `/doctor/assignments/{assignment_id}` |
| Doctor | POST | `/doctor/lectures` |
| Doctor | PATCH | `/doctor/lectures/{lecture_id}` |
| Doctor | POST | `/doctor/submissions/{submission_id}/grade` |
| Doctor | GET | `/doctor/quizzes` |
| Doctor | GET | `/doctor/quizzes/{quiz_id}/results` |
| Doctor | POST | `/doctor/quizzes` |
| Doctor | PATCH | `/doctor/quizzes/{quiz_id}` |
| Doctor | GET | `/doctor/attendance` |
| Doctor | POST | `/doctor/attendance` |
| Doctor | GET | `/doctor/students` |
| Doctor | POST | `/doctor/students/{student_id}/bonus` |
| Doctor | GET | `/doctor/messages` |
| Doctor | POST | `/doctor/messages` |
| Doctor | GET | `/doctor/inbox` |
| Doctor | GET | `/doctor/inbox/unread-count` |
| Doctor | PUT | `/doctor/inbox/{message_id}/read` |
| Doctor | GET | `/doctor/ratings` |
| Doctor | GET | `/doctor/profile` |
| Dept Admin | GET | `/admin/dashboard/summary` |
| Dept Admin | GET | `/admin/students` |
| Dept Admin | POST | `/admin/students` |
| Dept Admin | PATCH | `/admin/students/{student_id}` |
| Dept Admin | POST | `/admin/students/{student_id}/deactivate` |
| Dept Admin | POST | `/admin/students/{student_id}/reactivate` |
| Dept Admin | GET | `/admin/doctors` |
| Dept Admin | POST | `/admin/doctors` |
| Dept Admin | PATCH | `/admin/doctors/{doctor_id}` |
| Dept Admin | POST | `/admin/doctors/{doctor_id}/deactivate` |
| Dept Admin | POST | `/admin/doctors/{doctor_id}/reactivate` |
| Dept Admin | GET | `/admin/courses` |
| Dept Admin | POST | `/admin/courses` |
| Dept Admin | PATCH | `/admin/courses/{course_id}` |
| Dept Admin | POST | `/admin/courses/{course_id}/enroll` |
| Dept Admin | DELETE | `/admin/courses/{course_id}/enroll/{student_id}` |
| Dept Admin | GET | `/admin/attendance` |
| Dept Admin | GET | `/admin/points` |
| Dept Admin | GET | `/admin/messages` |
| Dept Admin | POST | `/admin/messages` |
| Dept Admin | GET | `/admin/settings` |
| Dept Admin | GET | `/admin/inbox` |
| Dept Admin | GET | `/admin/inbox/unread-count` |
| Dept Admin | PUT | `/admin/inbox/{message_id}/read` |
| Dept Admin | GET | `/admin/profile` |
| Dean | GET | `/dean/overview/summary` |
| Dean | GET | `/dean/departments` |
| Dean | POST | `/dean/departments` |
| Dean | GET | `/dean/departments/{department_id}` |
| Dean | GET | `/dean/analytics` |
| Dean | GET | `/dean/reports` |
| Dean | GET | `/dean/settings` |
| Dean | PATCH | `/dean/settings` |
| Dean | GET | `/dean/messages` |
| Dean | POST | `/dean/messages` |
| Dean | GET | `/dean/inbox` |
| Dean | GET | `/dean/inbox/unread-count` |
| Dean | PUT | `/dean/inbox/{message_id}/read` |
| Dean | GET | `/dean/profile` |
