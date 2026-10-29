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
- `201 Created`: Resource successfully created (e.g. creating a to-do).
- `204 No Content`: Resource successfully removed or state updated without content return.
- `401 Unauthorized`: Token is missing, malformed, or expired. Client automatically redirects to login.
- `403 Forbidden`: Authenticated user role is not authorized (`role != "student"`).
- `404 Not Found`: Resource with requested ID does not exist.
- `422 Unprocessable Entity`: Request body or query parameters validation failed.

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
  "department": "Software Engineering",
  "credit_hours": 3,
  "lectures_count": 24,
  "completed_lectures": 14,
  "schedule": "Sun, Tue 10:00 AM - 11:30 AM",
  "room": "Hall 3B"
}
```
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
    "ai_feedback": "Clean separation of bounded contexts. Notice: retry policies should include exponential backoff.",
    "final_grade": null,
    "max_grade": 20
  }
]
```
> **Note on grading:** Students receive instant preliminary AI feedback upon submission. The `final_grade` is populated only when explicitly assigned and approved by the course doctor.

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
  "warning_threshold": 4,
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
  ]
}
```

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
  "current_month": "October 2026",
  "points_reset_date": "2026-11-01T00:00:00Z",
  "monthly_top_3": [
    { "rank": 1, "name": "Yara Ibrahim", "points": 1560, "initials": "YI", "department": "Software Engineering" },
    { "rank": 2, "name": "Test Student", "points": 1420, "initials": "TS", "department": "Software Engineering", "is_current_user": true },
    { "rank": 3, "name": "Karim Hassan", "points": 1390, "initials": "KH", "department": "Software Engineering" }
  ],
  "breakdown": [
    { "source": "Assignment early submissions", "points": 400 },
    { "source": "Perfect lecture attendance streak", "points": 320 }
  ]
}
```

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
