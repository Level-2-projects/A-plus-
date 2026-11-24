# A Plus (A+) – Student Domain REST API Contract

> **Target Audience:** FastAPI + SQL Server Backend Engineering Team  
> **Base URL:** `http://localhost:8000` (configurable in `js/config.js`)  
> **Authentication:** HTTP Bearer token passed in the `Authorization` header (`Authorization: Bearer <jwt_access_token>`).

All student endpoints reside under the `/student/` URI namespace. Responses must be formatted as UTF-8 encoded JSON with appropriate HTTP response status codes.

---

## 1. Authentication & Security Model

All endpoints listed in this specification require an active Bearer JWT token in the request headers:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Standard Status Codes
- `200 OK`: Request succeeded, payload included.
- `201 Created`: Resource successfully created (e.g. creating a to-do, submitting an assignment).
- `204 No Content`: Resource successfully removed or state updated without content return.
- `400 Bad Request`: Action cannot be performed (e.g. quiz window closed).
- `401 Unauthorized`: Token is missing, malformed, or expired. Client automatically redirects to login.
- `403 Forbidden`: Authenticated user role is not authorized or resource belongs to another user/doctor.
- `404 Not Found`: Resource with requested ID does not exist.
- `409 Conflict`: Duplicate request (e.g. submitting an assignment or attempting a quiz twice).
- `422 Unprocessable Entity`: Request body or query parameters validation failed.
- `429 Too Many Requests`: Rating cooldown in effect (RATING_COOLDOWN_DAYS).

---

## 2. Endpoints Specification

### 2.1 Dashboard Summary
Retrieves aggregate metrics and counters for the main student dashboard.

- **Method / Path:** `GET /student/dashboard/summary`
- **Response `200 OK`:**
```json
{
  "enrolled_courses": 5,
  "pending_assignments": 1,
  "upcoming_quizzes": 1,
  "attendance_rate": 91.2,
  "points": 1420,
  "rank": 2,
  "unread_messages": 3
}
```

---

### 2.2 Enrolled Courses
Retrieves all courses currently enrolled by the authenticated student.

- **Method / Path:** `GET /student/courses`
- **Response `200 OK`:**
```json
[
  {
    "id": "cs301",
    "code": "SE301",
    "title": "Software Architecture & Design Patterns",
    "doctor": "Dr. Ahmed Mansour",
    "department": "Software Engineering",
    "credit_hours": 3,
    "lectures_count": 24,
    "completed_lectures": 14,
    "schedule": "Sun, Tue 10:00 AM - 11:30 AM",
    "room": "Hall 3B"
  }
]
```

---

### 2.3 Single Course Detail
Retrieves comprehensive details for a specific course by identifier or course code.

- **Method / Path:** `GET /student/courses/{course_id}`
- **Path Parameters:**
  - `course_id` (string, required): Course ID (e.g. `cs301`) or code (`SE301`).
- **Response `200 OK`:**
```json
{
  "id": "cs301",
  "code": "SE301",
  "title": "Software Architecture & Design Patterns",
  "doctor": "Dr. Ahmed Mansour",
  "doctor_id": "usr-6",
  "department": "Software Engineering",
  "credit_hours": 3,
  "lectures_count": 24,
  "completed_lectures": 14,
  "schedule": "Sun, Tue 10:00 AM - 11:30 AM",
  "room": "Hall 3B",
  "lectures": [
    { "id": "lec-a1", "number": 1, "title": "Introduction", "date": "2026-10-13", "material_url": null }
  ]
}
```
- `doctor_id` supports student ratings. `lectures` is ordered by lecture number and includes the course's lecture metadata.
- **Error `404 Not Found`:** Course ID not found.

---

### 2.4 Assignments
Retrieves all student assignments, submission records, and AI-generated preliminary feedback.

- **Method / Path:** `GET /student/assignments`
- **Response `200 OK`:**
```json
[
  {
    "id": "asg-01",
    "course_id": "cs301",
    "course_code": "SE301",
    "title": "Microservices Decomposition & Event Bus Spec",
    "due_date": "2026-10-30T23:59:00Z",
    "status": "submitted",
    "submitted_at": "2026-10-25T14:20:00Z",
    "is_late": false,
    "ai_feedback": "Clean separation of bounded contexts. Notice: retry policies should include exponential backoff.",
    "final_grade": null,
    "max_grade": 20
  }
]
```
> **Security Rule on AI Evaluation:** Students receive deterministic textual feedback (`ai_feedback`). The numerical opinion score (`ai_score_out_of_10`) is strictly confidential to the course doctor and is NEVER transmitted to student endpoints.

#### Submit Assignment
- **Method / Path:** `POST /student/assignments/{assignment_id}/submit`
- **Request Body:**
```json
{
  "content": "Attached repository and architecture documentation for the Hexagonal refactoring."
}
```
- **Response `201 Created`:**
```json
{
  "id": "sub-101",
  "assignment_id": "asg-a1",
  "submitted_at": "2026-10-30T21:00:00Z",
  "is_late": false,
  "ai_feedback": "Strong separation of domain logic from infrastructure..."
}
```
- **Error `409 Conflict`:** If student attempts to submit an assignment more than once.
- **Error `422 Unprocessable Entity`:** If `content` is empty.

---

### 2.5 Quizzes
Retrieves online quizzes across all enrolled courses.

- **Method / Path:** `GET /student/quizzes`
- **Response `200 OK`:**
```json
[
  {
    "id": "quiz-01",
    "course_code": "SE301",
    "title": "Design Patterns (Gang of Four) Mastery Quiz",
    "duration_minutes": 25,
    "questions_count": 15,
    "status": "upcoming",
    "available_from": "2026-10-28T10:00:00Z",
    "available_to": "2026-10-28T22:00:00Z",
    "score": null,
    "total_score": 15
  }
]
```

---

### 2.6 Attendance Records & Penalty Tracking
Retrieves aggregate attendance ratios, absence counts, and course-by-course warning statuses.

- **Method / Path:** `GET /student/attendance`
- **Response `200 OK`:**
```json
{
  "overall_percentage": 91.2,
  "total_lectures": 68,
  "attended_lectures": 62,
  "absence_count": 6,
  "grade_penalty_risk": false,
  "warning_threshold": 2,
  "courses": [
    {
      "course_id": "cs304",
      "course_code": "SE304",
      "course_title": "Operating Systems Internals & Concurrency",
      "total_sessions": 16,
      "attended": 13,
      "absences": 3,
      "percentage": 81.25,
      "penalty_status": "warning"
    }
  ],
  "history": [
    {
      "session_id": "ses-a3",
      "course_id": "crs-a",
      "course_code": "SE301",
      "lecture_title": "Event-Driven Architecture",
      "date": "2026-10-20",
      "status": "present"
    }
  ]
}
```
`history` is limited to the authenticated student's enrolled courses and includes the per-session attendance status.

---

### 2.7 To-Do Management

#### List Tasks
- **Method / Path:** `GET /student/todos`
- **Response `200 OK`:**
```json
[
  {
    "id": "td-1",
    "title": "Review SOLID patterns lecture recording",
    "course_code": "SE301",
    "due_date": "2026-10-27",
    "priority": "high",
    "completed": false,
    "created_at": "2026-10-24T09:00:00Z"
  }
]
```

#### Create Task
- **Method / Path:** `POST /student/todos`
- **Request Body:**
```json
{
  "title": "Read Chapter 4 on Distributed Transactions",
  "course_code": "SE301",
  "due_date": "2026-10-29",
  "priority": "medium"
}
```
- **Response `201 Created`:** Created todo entity.

#### Update Task
- **Method / Path:** `PATCH /student/todos/{todo_id}`
- **Request Body:**
```json
{
  "completed": true
}
```
- **Response `200 OK`:** Updated todo entity.

#### Delete Task
- **Method / Path:** `DELETE /student/todos/{todo_id}`
- **Response `204 No Content`**

---

### 2.8 Gamification Points & Monthly Leaderboard
Points reset automatically on the 1st of every calendar month.

- **Method / Path:** `GET /student/points`
- **Response `200 OK`:**
```json
{
  "current_points": 1420,
  "department_rank": 2,
  "department_name": "Software Engineering",
  "current_month": "2026-10",
  "points_reset_date": "2026-11-01",
  "monthly_top_3": [
    { "rank": 1, "name": "Yara Ibrahim", "points": 1560, "initials": "YI", "department": "Software Engineering" },
    { "rank": 2, "name": "Test Student", "points": 1420, "initials": "TS", "department": "Software Engineering", "is_current_user": true },
    { "rank": 3, "name": "Karim Hassan", "points": 1390, "initials": "KH", "department": "Software Engineering" }
  ],
  "breakdown": [
    { "source": "Assignment early submissions", "points": 400 },
    { "source": "Perfect lecture attendance streak", "points": 320 }
  ],
  "ledger": [
    { "source": "submission", "points": 10, "description": "On-time assignment submission", "created_at": "2026-10-28T12:00:00Z" }
  ]
}
```
`ledger` contains the authenticated student's current-month point entries, newest first. `points_reset_date` is a calendar date, not a timestamp.

---

### 2.9 Learning Roadmaps (PROVISIONAL)
> **Notice:** This endpoint and its schema are **PROVISIONAL**. The business rules, step dependencies, and milestone tracking logic will be defined and modified in future sprints.

Retrieves curriculum milestone tracks, skill progress percentages, and sequenced learning steps.

- **Method / Path:** `GET /student/roadmaps`
- **Response `200 OK`:**
```json
[
  {
    "id": "roadmap-fe",
    "title": "Frontend Engineering Track",
    "description": "Core milestone competencies for modern web client development.",
    "progress_percent": 35,
    "steps": [
      {
        "id": "step-fe-1",
        "title": "HTML5 Semantic Structure & Web Accessibility",
        "status": "done"
      },
      {
        "id": "step-fe-2",
        "title": "CSS Design Systems, Grid & Logical Properties",
        "status": "current"
      },
      {
        "id": "step-fe-3",
        "title": "Vanilla JavaScript ES Modules & Fetch Pipeline",
        "status": "locked"
      },
      {
        "id": "step-fe-4",
        "title": "Stateful Application Shell & Route Guards",
        "status": "locked"
      }
    ]
  }
]
```
> **Step Status States:**
> - `done`: Successfully fulfilled milestone.
> - `current`: Actively in-progress milestone.
> - `locked`: Inactive milestone requiring completion of prerequisite steps.

---

### 2.10 Inbox & Notifications

#### Fetch Messages
- **Method / Path:** `GET /student/inbox`
- **Response `200 OK`:**
```json
[
  {
    "id": "msg-101",
    "type": "warning",
    "sender": "Attendance Monitor",
    "subject": "Absence Notice: SE304 Operating Systems (3 Absences)",
    "body": "You have accumulated 3 absences in SE304. Reaching 4 absences will trigger a 5% grade penalty per university policy.",
    "created_at": "2026-10-25T08:30:00Z",
    "is_read": false
  }
]
```
> **Message Types:**
> - `warning`: Urgent alerts such as absence thresholds and grading penalties.
> - `notice`: Administrative or doctor announcements (e.g. rescheduled office hours).
> - `suggestion`: Automated AI feedback or learning recommendations.
> - `system`: General portal status updates, rewards, and semester milestones.

#### Mark Message as Read
- **Method / Path:** `PUT /student/inbox/{message_id}/read`
- **Response `200 OK`:**
```json
{
  "success": true,
  "id": "msg-101",
  "is_read": true
}
```

#### Unread Notification Count
- **Method / Path:** `GET /student/inbox/unread-count`
- **Response `200 OK`:**
```json
{
  "unread_count": 3
}
```

### 2.11 Anonymous Student Ratings
- **Method / Path:** `POST /student/ratings`
- **Request Body:**
```json
{
  "target_type": "lecture",
  "target_id": "lec-a3",
  "course_id": "crs-a",
  "score": 5,
  "comment": "Clear examples and a useful summary."
}
```
- `target_type` is `lecture` or `doctor`; `score` is an integer from 1 through 5.
- The target must belong to a course the student is enrolled in. Lecture targets must match the specified course; doctor targets must teach that course.
- A student cannot rate the same target again within `RATING_COOLDOWN_DAYS` (default 7); the server returns `429 Too Many Requests`.
- **Response `201 Created`:** The created rating for the requesting student. Student identities are never included in the doctor's aggregate ratings response.

---

## 3. Doctor Domain REST API Contract

All doctor endpoints reside under the `/doctor/` URI namespace and require `Authorization: Bearer <jwt_access_token>` with role `doctor`.

### 3.1 Doctor Dashboard Summary
Retrieves metrics requiring immediate attention (pending grading, risk of absence penalty, upcoming deadlines, average rating).

- **Method / Path:** `GET /doctor/dashboard/summary`
- **Response `200 OK`:**
```json
{
  "active_courses_count": 2,
  "pending_submissions_to_grade": 14,
  "students_at_absence_risk": 3,
  "upcoming_deadlines": [
    { "title": "SE301 - Microservices Architecture Spec", "due": "2026-11-04" },
    { "title": "SE304 - Process Scheduling Implementation", "due": "2026-11-08" }
  ],
  "average_student_rating": 4.8,
  "total_enrolled_students": 115
}
```

---

### 3.2 Doctor Courses
Retrieves assigned courses and syllabus progress.

- **Method / Path:** `GET /doctor/courses`
- **Response `200 OK`:**
```json
[
  {
    "id": "c-se301",
    "code": "SE301",
    "title": "Software Architecture & Design Patterns",
    "department": "Software Engineering",
    "credit_hours": 3,
    "enrolled_count": 68,
    "lectures_count": 12,
    "completed_lectures": 8,
    "schedule": "Sun & Tue 10:00 - 11:30 AM",
    "room": "Hall 302"
  }
]
```

- **Method / Path:** `GET /doctor/courses/{course_id}`
- **Response `200 OK`:** Single course object matching the structure above, including the ordered `lectures` array (`id`, `number`, `title`, `date`, `material_url`).

---

### 3.3 Doctor Assignments & Grading (US-03)
Retrieves student submissions with AI 10-point preliminary evaluation visible only to the doctor.

- **Method / Path:** `GET /doctor/assignments`
- **Response `200 OK`:**
```json
[
  {
    "id": "asg-doc-01",
    "course_code": "SE301",
    "title": "Assignment 2: Event-Driven Architecture Spec",
    "due_date": "2026-11-04T23:59:00Z",
    "total_submissions": 45,
    "pending_submissions": 6,
    "graded_submissions": 39,
    "max_grade": 100,
    "submissions": [
      {
        "id": "sub-101",
        "student_id": 101,
        "student_name": "Karim Adel",
        "content": "The student's submitted assignment text.",
        "submitted_at": "2026-10-27T16:20:00Z",
        "ai_evaluation": {
          "score_out_of_10": 8.8,
          "feedback_summary": "Solid event envelope design; Kafka topic partitioning is well articulated.",
          "confidence": 0.94
        },
        "doctor_final_grade": null,
        "doctor_feedback": null
      }
    ]
  }
]
```

#### Uncorrected Submissions Count (Sidebar Badge)
- **Method / Path:** `GET /doctor/assignments/pending-count`
- **Response `200 OK`:**
```json
{
  "pending_count": 14
}
```

#### Submit Doctor Final Grade
- **Method / Path:** `POST /doctor/submissions/{submission_id}/grade`
- **Request Body:**
```json
{
  "final_grade": 92,
  "doctor_feedback": "Excellent trade-off analysis between pub/sub and synchronous RPC."
}
```
- **Response `200 OK`:** Updated submission record.

---

### 3.4 Quizzes & Exam Management
- **Method / Path:** `GET /doctor/quizzes`
- **Response `200 OK`:**
```json
[
  {
    "id": "quiz-doc-01",
    "course_code": "SE301",
    "title": "Quiz 2: Clean Architecture & SOLID",
    "duration_minutes": 20,
    "scheduled_date": "2026-11-02T10:00:00Z",
    "status": "scheduled",
    "total_enrolled": 68,
    "completed_count": 0,
    "average_score": null
  }
]
```
- **Method / Path:** `GET /doctor/quizzes/{quiz_id}/results`
- **Response `200 OK`:**
```json
{
  "attempts": [
    { "student_name": "Karim Adel", "submitted_at": "2026-10-29T12:00:00Z", "score": 4, "total": 5 }
  ]
}
```
The route is doctor-only and is limited to quizzes in the authenticated doctor's courses.

---

### 3.5 Attendance Sessions
- **Method / Path:** `GET /doctor/attendance`
- **Response `200 OK`:** List of attendance sessions.

- **Method / Path:** `POST /doctor/attendance`
- **Request Body:**
```json
{
  "course_id": "crs-a",
  "lecture_id": "lec-a3",
  "date": "2026-10-30",
  "method": "manual",
  "records": [
    { "student_id": "usr-1", "status": "present" },
    { "student_id": "usr-2", "status": "absent" }
  ]
}
```
- `status` must be `present`, `absent`, or `excused`; every student must be enrolled in the course, and each student may appear once per session.
- **Response `201 Created`:** `{ "session_id": "...", "recorded": 2 }`. Invalid records return `422`; out-of-scope students return `403`. Crossing `ABSENCE_WARNING_THRESHOLD` creates one automatic warning message per student/course.

---

### 3.6 Student Roster & Bonus Points
- **Method / Path:** `GET /doctor/students?course=SE301`
- **Response `200 OK`:**
```json
[
  {
    "student_id": 101,
    "name": "Karim Adel",
    "course_code": "SE301",
    "attendance_rate": 93.3,
    "absences_count": 1,
    "at_penalty_risk": false,
    "current_grade": 94,
    "bonus_points_granted": 50,
    "current_month_points": 110
  }
]
```

#### Grant Bonus Points (Feeds Monthly Top-3)
- **Method / Path:** `POST /doctor/students/{student_id}/bonus`
- **Request Body:**
```json
{
  "points": 50,
  "reason": "Outstanding defense in class debate on Microkernel pattern"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "student_id": 101,
  "points_granted": 50,
  "new_total_bonus": 100
}
```

---

### 3.7 Messages & Alerts Outbox
- **Method / Path:** `GET /doctor/messages`
- **Response `200 OK`:** List of sent doctor notices and absence alerts.

- **Method / Path:** `POST /doctor/messages`
- **Request Body:**
```json
{
  "course_id": "crs-a",
  "recipient_ids": ["usr-1"],
  "type": "notice",
  "subject": "Office Hours Moved to Wednesday 1 PM",
  "body": "Due to department council meetings, office hours this week are rescheduled to Wednesday at 1:00 PM."
}
```
- Omit `recipient_ids` to notify all enrolled students. Explicit recipients must all be enrolled in the course. Supported types are `warning`, `notice`, `suggestion`, and `system`.
- **Response `201 Created`:** `{ "sent_count": 1, "message_ids": ["..."] }`; each message is delivered unread to the recipient's inbox.

---

### 3.8 Anonymous Course & Doctor Ratings
Aggregated student ratings and feedback without student identities.

- **Method / Path:** `GET /doctor/ratings`
- **Response `200 OK`:**
```json
{
  "overall_score": 4.8,
  "total_evaluations": 52,
  "breakdown": [
    { "metric": "Clarity of Explanation", "score": 4.9 },
    { "metric": "Course Materials & Slides", "score": 4.7 },
    { "metric": "Fairness of Grading", "score": 4.8 },
    { "metric": "Responsiveness to Questions", "score": 4.8 }
  ],
  "anonymous_comments": [
    {
      "course_code": "SE301",
      "date": "2026-10-24",
      "comment": "The real-world microservices case studies made complex patterns very clear."
    }
  ]
}
```

### 3.9 Doctor Course Content Management
- `POST /doctor/assignments` creates an assignment in an owned course; `PATCH /doctor/assignments/{assignment_id}` updates it.
- `POST /doctor/lectures` creates a lecture in an owned course; `PATCH /doctor/lectures/{lecture_id}` updates it.
- `POST /doctor/quizzes` creates a quiz in an owned course; `PATCH /doctor/quizzes/{quiz_id}` updates it.
- Every write is scoped to the authenticated doctor's own courses. Students enrolled in those courses can see the course content; other students cannot.

### 3.10 Doctor Inbox
Mirroring the student inbox contract, doctors receive department broadcasts and notifications. Messages are returned newest first. A doctor can only read and mark their own messages (403 or 404 for others). The doctor's sent messages never appear in the inbox.

#### List Received Messages
- **Method / Path:** `GET /doctor/inbox`
- **Response `200 OK`:**
```json
[
  {
    "id": "msg-201",
    "type": "notice",
    "sender_name": "Rania Hatem",
    "sender_type": "admin",
    "subject": "Faculty Council Meeting",
    "body": "Reminder: department council convenes this Thursday at 10 AM in Hall A.",
    "created_at": "2026-10-25T08:30:00Z",
    "is_read": false
  }
]
```

#### Mark Doctor Message as Read
- **Method / Path:** `PUT /doctor/inbox/{message_id}/read`
- **Response `200 OK`:**
```json
{
  "message": "Marked as read."
}
```

#### Doctor Unread Notification Count
- **Method / Path:** `GET /doctor/inbox/unread-count`
- **Response `200 OK`:**
```json
{
  "unread_count": 1
}
```

### 3.11 Department Admin Broadcasts and Settings
- **Method / Path:** `POST /admin/messages`
- **Request Body:** `recipient_type` may be `students`, `doctors`, `both`, `course`, or `dean`. A `course` broadcast requires `course_id`; the course must belong to the authenticated administrator's department or the route returns `403`.
- **Response `201 Created`:** `{ "sent_count": number }`. Each recipient receives exactly one unread message with the administrator's sender name and role.
- **Method / Path:** `GET /admin/messages`
- **Response `200 OK`:** The authenticated administrator's broadcast records, each including `recipient_count`.
- **Method / Path:** `GET /admin/settings`
- **Response `200 OK`:** Current institutional settings. Department administrators have read-only access; a department-admin token on `PATCH /dean/settings` returns `403`.

### 3.11 Department Admin Student Level
- `GET /admin/students` returns each student with `level` (`"1"` through `"5"`, or `null` for legacy records).
- `POST /admin/students` requires `level`; `PATCH /admin/students/{student_id}` accepts it. Values outside `1` through `5` return `422` with a field error.

### 3.12 Dean Analytics, Reports, and Active Settings
- **Method / Path:** `GET /dean/analytics?period=this_month|last_30_days|all_time`
- **Response `200 OK`:** College and per-department/per-course attendance rate, submission rate, average grade, average doctor rating plus count, at-risk count, average points, anonymous current/previous-month top-three rankings, and a needs-attention course list. Invalid `period` returns `422`.
- **Method / Path:** `GET /dean/reports?period=this_month|last_30_days|all_time`
- **Response `200 OK`:** CSV-ready arrays named `attendance`, `submissions_and_grades`, `doctor_ratings`, and `at_risk_students`. Rating comments remain anonymous; no dean response exposes a student identity or an `ai_score` field.
- **Method / Path:** `PATCH /dean/settings`
- Only `super_admin` may write settings. Ranges are absence threshold `1–20`, rating cooldown `1–365` days, and each points value `0–1000`; invalid writes return `422`. Saved values take effect immediately for new absence warnings, rating cooldown checks, and newly-awarded attendance, submission, and quiz points.

### 3.13 Dean Announcements & Inbox
- **Method / Path:** `GET /dean/messages`
- **Response `200 OK`:** List of broadcast announcements sent by the Dean, each with `recipient_count`, `audience`, `subject`, `body`, and `created_at`.
- **Method / Path:** `POST /dean/messages`
- **Request Body:**
```json
{
  "audience": "college",
  "subject": "Campus Convocation",
  "body": "Annual convocation announcement details.",
  "type": "notice"
}
```
- Supported audiences: `college`, `all_students`, `all_doctors`, `department`, `dept_students`, `dept_doctors`, `course`. Creates one unread message per recipient with sender name and role (`dean`).
- **Response `201 Created`:** `{ "sent_count": number, "broadcast_id": string }`.
- **Method / Path:** `GET /dean/inbox`
- **Response `200 OK`:** Messages received by the Dean (e.g. from department admins), newest first.
- **Method / Path:** `GET /dean/inbox/unread-count`
- **Response `200 OK`:** `{ "unread_count": number }`.
- **Method / Path:** `PUT /dean/inbox/{message_id}/read`
- **Response `200 OK`:** `{ "message": "Marked as read." }`.

---

## 4. Complete Mock Route Inventory

The mock server currently handles 86 routes, including the public `POST /auth/login` route. All other routes require authentication; student and doctor routes are role-restricted. `{...}` denotes a path parameter.

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
| Dean | GET | `/dean/overview/summary` |
| Dean | GET | `/dean/departments` |
| Dean | POST | `/dean/departments` |
| Dean | GET | `/dean/departments/{department_id}` |
| Dean | GET | `/dean/analytics?period=...` |
| Dean | GET | `/dean/reports?period=...` |
| Dean | GET | `/dean/settings` |
| Dean | PATCH | `/dean/settings` |
| Dean | GET | `/dean/messages` |
| Dean | POST | `/dean/messages` |
| Dean | GET | `/dean/inbox` |
| Dean | GET | `/dean/inbox/unread-count` |
| Dean | PUT | `/dean/inbox/{message_id}/read` |
| Dean | GET | `/dean/profile` |

### Integration Points
- `js/mock/mock-ai.js` currently supplies deterministic assignment feedback and an AI opinion score. Student responses include feedback only; the doctor assignment response is the only route exposing the AI opinion score.
- Replace `evaluateSubmission()` with the future n8n integration without changing student or doctor API response contracts.
- `getNow()` and `getCurrentMonth()` in `js/core/clock.js` are the mock time boundary for deadlines, attendance warning timestamps, rating cooldowns, and monthly points. The FastAPI backend must apply equivalent rules using server time.
- Student and doctor page API modules call the shared `request()` function only; the mock database remains an implementation detail of the mock server.
