/**
 * js/dev/test-scenarios.js – Automated test scenarios for the in-browser test runner.
 *
 * Each test scenario resets the mock database to a pristine seed state
 * and executes targeted assertions against either the mock server or API clients.
 *
 * Scenarios covered:
 *  1. Scenario 1: Auth & Scope enforcement (401 without token, 403 cross-role, doctor course isolation)
 *  2. Scenario 2: Doctor creates an assignment: enrolled students see it, unenrolled students do not
 *  3. Scenario 3: Student submits an assignment: single submission enforced (409 on second), instant AI feedback returned without AI score
 *  4. Scenario 4: Doctor views submissions WITH AI score, sets final grade (422 on invalid grade), student sees the grade
 *  5. Scenario 5: Quiz lifecycle: creation, single attempt enforcement (409), auto-grading, results visible to student & doctor
 *  6. Scenario 2B: Doctor course isolation: doctor cannot create/edit in another doctor's course (403)
 *  7. Scenario 2C: Leak check scan: zero ai_score keys across ANY student endpoint response
 *  8. Scenarios 6–7: Attendance warnings, doctor messages, inbox, and cross-tab notification updates
 *  9. Scenarios 8–11: Points, anonymous ratings, todo ownership/CRUD, and dashboard aggregates
 * 10. Scenario 12: Database persistence & reset functionality
 * 11. Scenario 13: Cross-tab synchronization via storage event
 * 12. Scenario 19: Shell navigation integrity – every nav href resolves to a real file on disk,
 *     profile.html exists in all four role folders, and admin/dean profile API endpoints return 200.
 *
 * Depends on: js/mock/mock-db.js, js/mock/mock-server.js, js/core/clock.js
 */

import { mockDb, MOCK_DB_KEY } from "../mock/mock-db.js";
import { handle as mockServerHandle } from "../mock/mock-server.js";
import { setFakeClock, clearFakeClock } from "../core/clock.js";
import { formatDate } from "../components/date-format.js";

/**
 * Asserts condition is strictly true or throws detailed error.
 *
 * @param {boolean} condition
 * @param {string} message
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

/**
 * Asserts equality between two values.
 *
 * @param {any} actual
 * @param {any} expected
 * @param {string} [label="Equality check"]
 */
function assertEqual(actual, expected, label = "Equality check") {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Recursively scans any object/array for keys matching a regex.
 *
 * @param {any} obj
 * @param {RegExp} pattern
 * @param {string} [path=""]
 * @returns {string[]} List of matched paths
 */
function scanForbiddenKeys(obj, pattern, path = "") {
  const matches = [];
  if (!obj || typeof obj !== "object") return matches;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      matches.push(...scanForbiddenKeys(item, pattern, `${path}[${index}]`));
    });
    return matches;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (pattern.test(key)) {
      matches.push(currentPath);
    }
    if (value && typeof value === "object") {
      matches.push(...scanForbiddenKeys(value, pattern, currentPath));
    }
  }

  return matches;
}

export const SCENARIOS = [
  /* -------------------------------------------------------------
     Scenario 1: Auth & Scope Enforcement
  ------------------------------------------------------------- */
  {
    id: "sc-1-auth-scope",
    title: "Scenario 1: Auth & Scope Enforcement (401, 403, and Course Isolation)",
    category: "Security & Permissions",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      // 1. Missing or invalid Bearer token must return 401
      const resNoToken = mockServerHandle("GET", "/student/courses", null, null);
      assertEqual(resNoToken.status, 401, "No token returns 401");

      const resBadToken = mockServerHandle("GET", "/student/courses", null, "invalid-token-xyz");
      assertEqual(resBadToken.status, 401, "Malformed token returns 401");

      // 2. Student attempting to call a Doctor endpoint must return 403 Forbidden
      const studentToken = "aplus-mock-usr-1"; // Student Karim Adel
      const resStudentOnDoctor = mockServerHandle("GET", "/doctor/dashboard/summary", null, studentToken);
      assertEqual(resStudentOnDoctor.status, 403, "Student accessing doctor route returns 403");

      // 3. Doctor attempting to call a Student endpoint must return 403 Forbidden
      const doctorToken = "aplus-mock-usr-6"; // Dr. Ahmed Mansour (Doctor 1)
      const resDoctorOnStudent = mockServerHandle("GET", "/student/dashboard/summary", null, doctorToken);
      assertEqual(resDoctorOnStudent.status, 403, "Doctor accessing student route returns 403");

      // 4. Doctor isolation: Doctor 1 cannot manage or view Doctor 2's course (crs-c)
      const resDoc1OnCourseC = mockServerHandle("GET", "/doctor/courses/crs-c", null, doctorToken);
      assertEqual(resDoc1OnCourseC.status, 404, "Doctor 1 accessing Course C returns 404 (out of scope)");

      // Doctor 1 attempting to grade a submission in another doctor's course must fail with 403
      // sub-6 belongs to asg-c2 which is taught by Doctor 2 (crs-c)
      const resDoc1GradeDoc2 = mockServerHandle("POST", "/doctor/submissions/sub-6/grade", { final_grade: 18 }, doctorToken);
      assertEqual(resDoc1GradeDoc2.status, 403, "Doctor 1 grading Doctor 2's submission returns 403");

      // 5. Student isolation: Student 5 is ONLY enrolled in crs-c (Doctor 2).
      // They must NOT see Doctor 1's courses (crs-a, crs-b) in their course list.
      const student5Token = "aplus-mock-usr-5";
      const resStudent5Courses = mockServerHandle("GET", "/student/courses", null, student5Token);
      assertEqual(resStudent5Courses.status, 200, "Student 5 courses fetched");
      const s5CourseIds = resStudent5Courses.data.map((c) => c.id);
      assert(s5CourseIds.includes("crs-c"), "Student 5 is enrolled in crs-c");
      assert(!s5CourseIds.includes("crs-a"), "Student 5 cannot see crs-a");
      assert(!s5CourseIds.includes("crs-b"), "Student 5 cannot see crs-b");

      const studentCourseByCode = mockServerHandle("GET", "/student/courses/SE301", null, studentToken);
      assertEqual(studentCourseByCode.status, 200, "Student course lookup accepts a course code");
      assertEqual(studentCourseByCode.data.id, "crs-a", "Course-code lookup resolves to the enrolled course");
      assertEqual(studentCourseByCode.data.doctor_id, "usr-6", "Course detail identifies its instructor for ratings");
      assert(studentCourseByCode.data.lectures.some((lecture) => lecture.id === "lec-a1"), "Course detail includes its lectures");

      const doctorCourseByCode = mockServerHandle("GET", "/doctor/courses/SE304", null, doctorToken);
      assertEqual(doctorCourseByCode.status, 200, "Doctor course lookup accepts a course code");
      assertEqual(doctorCourseByCode.data.id, "crs-b", "Doctor course-code lookup resolves to an owned course");
      assert(doctorCourseByCode.data.lectures.some((lecture) => lecture.id === "lec-b1"), "Doctor course detail includes owned lectures");
    },
  },

  /* -------------------------------------------------------------
     Scenario 2: Doctor creates an assignment -> visibility check
  ------------------------------------------------------------- */
  {
    id: "sc-2-assignment-creation-visibility",
    title: "Scenario 2: Doctor Creates Assignment (Enrolled Students See It, Unenrolled Do Not)",
    category: "Assignments & Visibility",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const doctor1Token = "aplus-mock-usr-6"; // Doctor 1 (teaches crs-a and crs-b)

      // Doctor creates assignment in Course A (SE301)
      const newAsgPayload = {
        course_id: "crs-a",
        title: "Sprint 3: Microkernel Architecture Lab",
        description: "Implement a plug-in architecture with dynamic module loading.",
        due_date: "2027-06-25T23:59:00Z",
        max_grade: 20,
      };

      const createRes = mockServerHandle("POST", "/doctor/assignments", newAsgPayload, doctor1Token);
      assertEqual(createRes.status, 201, "Assignment created with 201");
      const createdAsgId = createRes.data.id;
      assert(Boolean(createdAsgId), "Assignment ID generated");

      // Student 1 (Karim, enrolled in Course A) fetches assignments
      const student1Token = "aplus-mock-usr-1";
      const s1Res = mockServerHandle("GET", "/student/assignments", null, student1Token);
      assertEqual(s1Res.status, 200, "Student 1 assignments fetched");
      const s1AsgIds = s1Res.data.map((a) => a.id);
      assert(s1AsgIds.includes(createdAsgId), "Student 1 (enrolled) sees the newly created assignment");

      // Student 5 (Laila, enrolled ONLY in crs-c) fetches assignments
      const student5Token = "aplus-mock-usr-5";
      const s5Res = mockServerHandle("GET", "/student/assignments", null, student5Token);
      assertEqual(s5Res.status, 200, "Student 5 assignments fetched");
      const s5AsgIds = s5Res.data.map((a) => a.id);
      assert(!s5AsgIds.includes(createdAsgId), "Student 5 (NOT enrolled) CANNOT see the assignment");

      // Direct ID lookup by Student 5 on that assignment must return 404
      const s5DirectRes = mockServerHandle("GET", `/student/assignments/${createdAsgId}`, null, student5Token);
      assertEqual(s5DirectRes.status, 404, "Student 5 cannot access unenrolled assignment by ID");
    },
  },

  /* -------------------------------------------------------------
     Scenario 3: Student submits assignment -> duplicate 409 & AI feedback
  ------------------------------------------------------------- */
  {
    id: "sc-3-student-submission-ai-feedback",
    title: "Scenario 3: Student Submits Assignment (One-Time Submit, Instant AI Feedback, No AI Score)",
    category: "Submissions & AI",
    run: async () => {
      mockDb.resetToSeed();
      // Set clock to 2026-11-05 so asg-a1 (due 2026-11-10) is still open and on-time
      setFakeClock(new Date("2026-11-05T10:00:00Z"));

      const student1Token = "aplus-mock-usr-1"; // Student Karim Adel (enrolled in crs-a)
      // asg-a1 is currently open and has no submission by student 1
      const asgId = "asg-a1";

      const submitPayload = {
        content: "Here is my architectural decomposition report and complete UML package diagram.",
      };

      // 1. First submission succeeds
      const subRes = mockServerHandle("POST", `/student/assignments/${asgId}/submit`, submitPayload, student1Token);
      assertEqual(subRes.status, 201, "First submission returns 201 Created");
      assert(Boolean(subRes.data.id), "Submission ID returned");
      assert(Boolean(subRes.data.ai_feedback), "AI feedback summary returned to student");
      assertEqual(subRes.data.is_late, false, "Submission marked on-time");

      // Verify that AI score is NOT in student response
      assert(!("ai_score_out_of_10" in subRes.data), "ai_score_out_of_10 is strictly absent in submission response");
      assert(!("score_out_of_10" in subRes.data), "score_out_of_10 is strictly absent in submission response");

      // 2. Second submission on the SAME assignment must return 409 Conflict
      const duplicateRes = mockServerHandle("POST", `/student/assignments/${asgId}/submit`, submitPayload, student1Token);
      assertEqual(duplicateRes.status, 409, "Second submission returns 409 Conflict");

      // 3. Submitting with empty content returns 422
      const emptyRes = mockServerHandle("POST", `/student/assignments/asg-b1/submit`, { content: "  " }, "aplus-mock-usr-2");
      assertEqual(emptyRes.status, 422, "Empty content submission returns 422 Unprocessable Entity");

      // Restore real clock after sc-3 finishes
      clearFakeClock();
    },
  },

  /* -------------------------------------------------------------
     Scenario 4: Doctor views AI score, grades submission, student sees grade
  ------------------------------------------------------------- */
  {
    id: "sc-4-doctor-grading-flow",
    title: "Scenario 4: Doctor Views AI Score, Sets Grade (422 Validated), Student Sees Final Grade",
    category: "Grading & Evaluation",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const doctor1Token = "aplus-mock-usr-6"; // Dr. Ahmed Mansour (Course A)
      const student1Token = "aplus-mock-usr-1"; // Karim Adel

      // In seed data: Student 2 submitted sub-2 for asg-a2 (max grade 20), pending grading
      const targetSubId = "sub-2";

      // 1. Doctor retrieves assignments
      const docAsgRes = mockServerHandle("GET", "/doctor/assignments", null, doctor1Token);
      assertEqual(docAsgRes.status, 200, "Doctor assignments fetched");

      // Find the assignment and sub-2
      const asgA2 = docAsgRes.data.find((a) => a.id === "asg-a2");
      assert(Boolean(asgA2), "Assignment A2 found");
      const sub2DocView = asgA2.submissions.find((s) => s.id === targetSubId);
      assert(Boolean(sub2DocView), "Submission sub-2 found in doctor view");
      assertEqual(sub2DocView.content, "Hexagonal architecture applied; see GitHub repo link and design document.",
        "Doctor view includes the submitted student work for grading");

      // The doctor MUST see the AI score
      assert(Boolean(sub2DocView.ai_evaluation), "Doctor sees AI evaluation block");
      assert(typeof sub2DocView.ai_evaluation.score_out_of_10 === "number", "Doctor sees numeric AI score out of 10");
      assertEqual(sub2DocView.doctor_final_grade, null, "Final grade starts as null");

      // 2. Doctor attempts to submit an INVALID grade (> max_grade 20 or negative) -> returns 422
      const invalidGradeRes = mockServerHandle("POST", `/doctor/submissions/${targetSubId}/grade`, { final_grade: 25 }, doctor1Token);
      assertEqual(invalidGradeRes.status, 422, "Grade above max_grade returns 422 Unprocessable Entity");

      const negGradeRes = mockServerHandle("POST", `/doctor/submissions/${targetSubId}/grade`, { final_grade: -5 }, doctor1Token);
      assertEqual(negGradeRes.status, 422, "Negative grade returns 422 Unprocessable Entity");

      // 3. Doctor submits VALID final grade
      const validGradeRes = mockServerHandle(
        "POST",
        `/doctor/submissions/${targetSubId}/grade`,
        { final_grade: 19, doctor_feedback: "Superb hexagonal boundary separation." },
        doctor1Token
      );
      assertEqual(validGradeRes.status, 200, "Grade saved successfully with 200 OK");

      // 4. Student 2 views assignments -> now sees final_grade = 19 and doctor_feedback
      const student2Token = "aplus-mock-usr-2";
      const s2AsgRes = mockServerHandle("GET", "/student/assignments", null, student2Token);
      assertEqual(s2AsgRes.status, 200, "Student 2 assignments fetched");
      const s2AsgA2 = s2AsgRes.data.find((a) => a.id === "asg-a2");
      assert(Boolean(s2AsgA2), "Student 2 sees asg-a2");
      assertEqual(s2AsgA2.status, "graded", "Assignment status changed to graded");
      assertEqual(s2AsgA2.final_grade, 19, "Student sees doctor's final grade");
      assertEqual(s2AsgA2.doctor_feedback, "Superb hexagonal boundary separation.", "Student sees doctor's feedback");

      // Check student still does NOT have the AI score
      assert(!("ai_score_out_of_10" in s2AsgA2), "Student does not have ai_score_out_of_10");
    },
  },

  /* -------------------------------------------------------------
     Scenario 5: Quiz Lifecycle (Creation, One Attempt, Auto-Grade)
  ------------------------------------------------------------- */
  {
    id: "sc-5-quiz-lifecycle",
    title: "Scenario 5: Quiz Creation, Single Attempt Enforced (409), Auto-Grading & Shared Results",
    category: "Quizzes",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const doctor1Token = "aplus-mock-usr-6";
      const student1Token = "aplus-mock-usr-1";

      // 1. Doctor creates an active quiz for Course A
      const nowIso = new Date().toISOString();
      const futureIso = new Date(Date.now() + 86400000).toISOString();
      const newQuizPayload = {
        course_id: "crs-a",
        title: "Microservices Design Quiz",
        duration_minutes: 15,
        available_from: nowIso,
        available_to: futureIso,
        questions: [
          {
            id: "q1",
            text: "What architectural pattern decouples services via events?",
            options: ["Monolith", "Event-Driven Architecture", "Batch Script", "Client-Server"],
            correct_index: 1,
            points: 1,
          },
          {
            id: "q2",
            text: "What is an anti-corruption layer used for?",
            options: ["Data encryption", "Translating domain models", "Hardware firewall", "Memory paging"],
            correct_index: 1,
            points: 1,
          },
        ],
      };

      const createQuizRes = mockServerHandle("POST", "/doctor/quizzes", newQuizPayload, doctor1Token);
      assertEqual(createQuizRes.status, 201, "Quiz created with 201 Created");
      const quizId = createQuizRes.data.id;

      // 2. Student fetches the active quiz with questions (without correct_index)
      const studentQuizRes = mockServerHandle("GET", `/student/quizzes/${quizId}`, null, student1Token);
      assertEqual(studentQuizRes.status, 200, "Student fetched active quiz");
      assertEqual(studentQuizRes.data.questions_count, 2, "Quiz has 2 questions");
      assert(Array.isArray(studentQuizRes.data.questions), "Active quiz exposes question list to student");
      assert(!("correct_index" in studentQuizRes.data.questions[0]), "correct_index is hidden from student");

      // 3. Student submits answers (Question 1 correct [1], Question 2 wrong [0])
      const attemptRes = mockServerHandle("POST", `/student/quizzes/${quizId}/attempt`, { answers: [1, 0] }, student1Token);
      assertEqual(attemptRes.status, 201, "Attempt recorded with 201");
      assertEqual(attemptRes.data.score, 1, "Auto-graded score is 1 out of 2");
      assertEqual(attemptRes.data.total, 2, "Total questions is 2");

      // 4. Second attempt by the same student returns 409 Conflict
      const secondAttemptRes = mockServerHandle("POST", `/student/quizzes/${quizId}/attempt`, { answers: [1, 1] }, student1Token);
      assertEqual(secondAttemptRes.status, 409, "Second attempt returns 409 Conflict");

      // 5. Doctor views quiz results
      const docQuizzesRes = mockServerHandle("GET", "/doctor/quizzes", null, doctor1Token);
      assertEqual(docQuizzesRes.status, 200, "Doctor quizzes fetched");
      const docQuiz = docQuizzesRes.data.find((q) => q.id === quizId);
      assert(Boolean(docQuiz), "Doctor sees newly created quiz");
      assertEqual(docQuiz.completed_count, 1, "Completed count is 1");
      assertEqual(docQuiz.average_score, 1, "Average score is 1");
      const resultsRes = mockServerHandle("GET", `/doctor/quizzes/${quizId}/results`, null, doctor1Token);
      assertEqual(resultsRes.status, 200, "Doctor can open the quiz results page");
      assertEqual(resultsRes.data.attempts.length, 1, "Results include the completed attempt");
      assertEqual(resultsRes.data.attempts[0].student_name, "Karim Adel", "Doctor results identify the student");
      assertEqual(resultsRes.data.attempts[0].score, 1, "Doctor results include the attempt score");
    },
  },

  /* -------------------------------------------------------------
     Scenario 2B: Doctor Course Isolation (Cross-Doctor Writes Forbidden)
  ------------------------------------------------------------- */
  {
    id: "sc-2b-cross-doctor-isolation",
    title: "Scenario 2B: Doctor Cannot Create or Edit Anything in Another Doctor's Course (403)",
    category: "Security & Permissions",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const doctor1Token = "aplus-mock-usr-6"; // Doctor 1 (teaches crs-a, crs-b)
      const doc2CourseId = "crs-c"; // Course C taught by Doctor 2 (Dr. Sara Nabil)

      // 1. Doctor 1 attempts to create an assignment in Course C -> returns 403
      const asgRes = mockServerHandle(
        "POST",
        "/doctor/assignments",
        {
          course_id: doc2CourseId,
          title: "Malicious Assignment Insertion",
          due_date: "2026-12-01T00:00:00Z",
        },
        doctor1Token
      );
      assertEqual(asgRes.status, 403, "Doctor 1 creating assignment in Course C returns 403 Forbidden");

      // 2. Doctor 1 attempts to create a lecture in Course C -> returns 403
      const lecRes = mockServerHandle(
        "POST",
        "/doctor/lectures",
        {
          course_id: doc2CourseId,
          title: "Unauthorized Lecture",
        },
        doctor1Token
      );
      assertEqual(lecRes.status, 403, "Doctor 1 creating lecture in Course C returns 403 Forbidden");

      // 3. Doctor 1 attempts to create a quiz in Course C -> returns 403
      const quizRes = mockServerHandle(
        "POST",
        "/doctor/quizzes",
        {
          course_id: doc2CourseId,
          title: "Unauthorized Quiz",
          questions: [],
        },
        doctor1Token
      );
      assertEqual(quizRes.status, 403, "Doctor 1 creating quiz in Course C returns 403 Forbidden");

      // 4. Doctor 1 attempts to record attendance in Course C -> returns 403
      const attRes = mockServerHandle(
        "POST",
        "/doctor/attendance",
        {
          course_id: doc2CourseId,
          date: "2026-10-30",
          records: [],
        },
        doctor1Token
      );
      assertEqual(attRes.status, 403, "Doctor 1 recording attendance in Course C returns 403 Forbidden");
    },
  },

  /* -------------------------------------------------------------
     Scenario 2C: Strict AI Score Leak Check Across ALL Student Endpoints
  ------------------------------------------------------------- */
  {
    id: "sc-2c-student-ai-score-leak-check",
    title: "Scenario 2C: Deep Scan for AI Score Leaks in All Student Endpoints (Zero Tolerance)",
    category: "Security & Permissions",
    run: async () => {
      mockDb.resetToSeed();
      setFakeClock("2026-11-05T12:00:00.000Z");

      const studentToken = "aplus-mock-usr-1"; // Karim Adel
      const forbiddenPattern = /(ai_score|score_out_of_10)/i;
      const assertStudentResponseHasNoLeak = (endpoint, response) => {
        const leaks = scanForbiddenKeys(response, forbiddenPattern);
        if (leaks.length > 0) {
          throw new Error(`LEAK DETECTED at ${endpoint}: forbidden keys found: ${leaks.join(", ")}`);
        }
      };

      try {
        // Scan every student GET endpoint, then exercise every student mutation route.
        const studentEndpoints = [
          "/student/dashboard/summary",
          "/student/courses",
          "/student/courses/crs-a",
          "/student/courses/SE301",
          "/student/assignments",
          "/student/assignments/asg-a1",
          "/student/assignments/asg-a2",
          "/student/quizzes",
          "/student/quizzes/qz-a1",
          "/student/quizzes/qz-a2",
          "/student/attendance",
          "/student/todos",
          "/student/points",
          "/student/roadmaps",
          "/student/inbox",
          "/student/inbox/unread-count",
          "/student/profile",
        ];

        for (const endpoint of studentEndpoints) {
          const res = mockServerHandle("GET", endpoint, null, studentToken);
          assertEqual(res.status, 200, `Endpoint ${endpoint} responds with 200`);
          assertStudentResponseHasNoLeak(endpoint, res);
        }

        const mutationResponses = [
          [
            "/student/assignments/asg-a1/submit",
            mockServerHandle(
              "POST",
              "/student/assignments/asg-a1/submit",
              { content: "Test scan content" },
              studentToken
            ),
            201,
          ],
          [
            "/student/quizzes/qz-a2/attempt",
            mockServerHandle(
              "POST",
              "/student/quizzes/qz-a2/attempt",
              { answers: [1, 0] },
              studentToken
            ),
            201,
          ],
          [
            "/student/inbox/msg-2/read",
            mockServerHandle("PUT", "/student/inbox/msg-2/read", null, studentToken),
            200,
          ],
          [
            "/student/ratings",
            mockServerHandle(
              "POST",
              "/student/ratings",
              {
                target_type: "lecture",
                target_id: "lec-a3",
                course_id: "crs-a",
                score: 5,
                comment: "Test leak scan",
              },
              studentToken
            ),
            201,
          ],
        ];

        const todoCreate = mockServerHandle(
          "POST",
          "/student/todos",
          { title: "AI leak scan", course_code: "SE301" },
          studentToken
        );
        mutationResponses.push(["/student/todos", todoCreate, 201]);
        const todoId = todoCreate.data?.id;
        mutationResponses.push([
          `/student/todos/${todoId}`,
          mockServerHandle("PATCH", `/student/todos/${todoId}`, { completed: true }, studentToken),
          200,
        ]);
        mutationResponses.push([
          `/student/todos/${todoId}`,
          mockServerHandle("DELETE", `/student/todos/${todoId}`, null, studentToken),
          204,
        ]);

        for (const [endpoint, response, expectedStatus] of mutationResponses) {
          assertEqual(response.status, expectedStatus, `Endpoint ${endpoint} responds with ${expectedStatus}`);
          assertStudentResponseHasNoLeak(endpoint, response);
        }
      } finally {
        clearFakeClock();
      }
    },
  },

  /* -------------------------------------------------------------
     Scenario 6: Attendance & One-Time Absence Warning
  ------------------------------------------------------------- */
  {
    id: "sc-6-attendance-absence-warning",
    title: "Scenario 6: Attendance Recording Creates One Absence Warning at Threshold",
    category: "Attendance & Alerts",
    run: async () => {
      mockDb.resetToSeed();
      setFakeClock("2026-10-30T12:00:00.000Z");

      try {
        const doctorToken = "aplus-mock-usr-6";
        const studentToken = "aplus-mock-usr-2";
        const warningForStudent = () => mockDb.load().messages.filter(
          (message) =>
            message.recipient_id === "usr-2" &&
            message.course_id === "crs-a" &&
            message.type === "warning" &&
            message.subject.startsWith("Absence Warning:")
        );

        const invalidStatus = mockServerHandle(
          "POST",
          "/doctor/attendance",
          {
            course_id: "crs-a",
            date: "2026-10-30",
            records: [{ student_id: "usr-2", status: "unknown" }],
          },
          doctorToken
        );
        assertEqual(invalidStatus.status, 422, "Unknown attendance status returns 422");
        assertEqual(mockDb.load().attendance_sessions.filter((session) => session.date === "2026-10-30").length, 0,
          "Invalid attendance does not create a partial session");

        const firstAbsence = mockServerHandle(
          "POST",
          "/doctor/attendance",
          {
            course_id: "crs-a",
            lecture_id: "lec-a3",
            date: "2026-10-30",
            method: "manual",
            records: [{ student_id: "usr-2", status: "absent" }],
          },
          doctorToken
        );
        assertEqual(firstAbsence.status, 201, "Valid attendance session is recorded");
        assertEqual(warningForStudent().length, 1, "Crossing the threshold creates one warning");

        const invalidScope = mockServerHandle(
          "POST",
          "/doctor/attendance",
          {
            course_id: "crs-a",
            date: "2026-10-31",
            records: [{ student_id: "usr-5", status: "present" }],
          },
          doctorToken
        );
        assertEqual(invalidScope.status, 403, "Doctor cannot record attendance for an unenrolled student");

        const laterAbsence = mockServerHandle(
          "POST",
          "/doctor/attendance",
          {
            course_id: "crs-a",
            date: "2026-11-01",
            records: [{ student_id: "usr-2", status: "absent" }],
          },
          doctorToken
        );
        assertEqual(laterAbsence.status, 201, "Later attendance session is recorded");
        assertEqual(warningForStudent().length, 1, "Further absences do not duplicate the warning");

        const attendanceRes = mockServerHandle("GET", "/student/attendance", null, studentToken);
        assertEqual(attendanceRes.status, 200, "Student attendance is available");
        const courseAttendance = attendanceRes.data.courses.find((course) => course.course_id === "crs-a");
        assertEqual(courseAttendance.absences, 3, "Student attendance reflects all absences");
        assertEqual(courseAttendance.penalty_status, "warning", "Course reflects the warning status");
        assert(attendanceRes.data.history.some((session) => session.date === "2026-10-30" && session.status === "absent"),
          "Student attendance history includes the recorded session and status");

        const inboxRes = mockServerHandle("GET", "/student/inbox", null, studentToken);
        assert(inboxRes.data.some((message) => warningForStudent().some((warning) => warning.id === message.id)),
          "Automatic warning appears in the student's inbox");
      } finally {
        clearFakeClock();
      }
    },
  },

  /* -------------------------------------------------------------
     Scenario 7: Doctor Messages, Inbox, and Read State
  ------------------------------------------------------------- */
  {
    id: "sc-7-doctor-messages-inbox",
    title: "Scenario 7: Doctor Message Delivery, Inbox Read State, and Scope",
    category: "Messages & Notifications",
    run: async () => {
      mockDb.resetToSeed();
      setFakeClock("2026-10-30T12:00:00.000Z");

      try {
        const doctorToken = "aplus-mock-usr-6";
        const studentToken = "aplus-mock-usr-1";
        const otherStudentToken = "aplus-mock-usr-2";
        const beforeUnread = mockServerHandle("GET", "/student/inbox/unread-count", null, studentToken).data.unread_count;

        const sent = mockServerHandle(
          "POST",
          "/doctor/messages",
          {
            course_id: "crs-a",
            recipient_ids: ["usr-1"],
            type: "suggestion",
            subject: "Review the lecture notes",
            body: "Revisit the trade-off discussion before the next assignment.",
          },
          doctorToken
        );
        assertEqual(sent.status, 201, "Doctor message is sent");
        assertEqual(sent.data.sent_count, 1, "Only the selected enrolled student receives the message");

        const invalidType = mockServerHandle(
          "POST",
          "/doctor/messages",
          {
            course_id: "crs-a",
            type: "urgent",
            subject: "Invalid type",
            body: "This must fail validation.",
          },
          doctorToken
        );
        assertEqual(invalidType.status, 422, "Unknown message types are rejected");

        const mixedRecipients = mockServerHandle(
          "POST",
          "/doctor/messages",
          {
            course_id: "crs-a",
            recipient_ids: ["usr-1", "usr-5"],
            type: "notice",
            subject: "Scope validation",
            body: "A mixed recipient list must not partially send.",
          },
          doctorToken
        );
        assertEqual(mixedRecipients.status, 403, "A recipient list containing an unenrolled student is rejected");

        const studentInbox = mockServerHandle("GET", "/student/inbox", null, studentToken);
        const delivered = studentInbox.data.find((message) => message.id === sent.data.message_ids[0]);
        assert(Boolean(delivered), "Sent message is visible in the recipient inbox");
        assertEqual(delivered.type, "suggestion", "Message type is preserved");
        assertEqual(delivered.is_read, false, "New messages are unread");

        const doctorOutbox = mockServerHandle("GET", "/doctor/messages", null, doctorToken);
        assert(doctorOutbox.data.some((message) => message.id === delivered.id), "Doctor can see the delivered message in the outbox");

        const afterUnread = mockServerHandle("GET", "/student/inbox/unread-count", null, studentToken);
        assertEqual(afterUnread.data.unread_count, beforeUnread + 1, "Unread count increments after delivery");

        const markRead = mockServerHandle("PUT", `/student/inbox/${delivered.id}/read`, null, studentToken);
        assertEqual(markRead.status, 200, "Recipient can mark the message as read");
        const afterRead = mockServerHandle("GET", "/student/inbox/unread-count", null, studentToken);
        assertEqual(afterRead.data.unread_count, beforeUnread, "Unread count decrements after reading");

        const otherStudentRead = mockServerHandle("PUT", `/student/inbox/${delivered.id}/read`, null, otherStudentToken);
        assertEqual(otherStudentRead.status, 404, "Another student cannot read the recipient's message");
      } finally {
        clearFakeClock();
      }
    },
  },

  /* -------------------------------------------------------------
     Scenario 8: Monthly Points & Bonus Ledger
  ------------------------------------------------------------- */
  {
    id: "sc-8-points-monthly-ledger",
    title: "Scenario 8: Monthly Points, Reset Boundary, and Doctor Bonus Points",
    category: "Points & Leaderboard",
    run: async () => {
      mockDb.resetToSeed();
      setFakeClock("2026-10-30T12:00:00.000Z");

      try {
        const studentToken = "aplus-mock-usr-1";
        const doctorToken = "aplus-mock-usr-6";
        const initialPoints = mockServerHandle("GET", "/student/points", null, studentToken);
        assertEqual(initialPoints.status, 200, "Student points are available");
        assertEqual(initialPoints.data.current_points, 110, "October points are summed from the ledger");
        assertEqual(initialPoints.data.points_reset_date, "2026-11-01", "Next reset date remains correct across time zones");
        assertEqual(
          formatDate(initialPoints.data.points_reset_date, new Date("2026-10-30T12:00:00.000Z")).absolute,
          "Nov 1, 2026",
          "Calendar reset date formats without a timezone day shift"
        );
        assert(initialPoints.data.ledger.length > 0, "Student points include current-month ledger history");
        const seededBonusTotal = mockDb.load().points_ledger
          .filter((entry) => entry.student_id === "usr-1" && entry.source === "bonus")
          .reduce((sum, entry) => sum + entry.points, 0);

        const invalidBonus = mockServerHandle(
          "POST",
          "/doctor/students/usr-1/bonus",
          { points: -5, reason: "Invalid award" },
          doctorToken
        );
        assertEqual(invalidBonus.status, 422, "Negative bonus points are rejected");

        const bonus = mockServerHandle(
          "POST",
          "/doctor/students/usr-1/bonus",
          { points: 25, reason: "Excellent class contribution" },
          doctorToken
        );
        assertEqual(bonus.status, 200, "Doctor can award bonus points to an enrolled student");
        assertEqual(bonus.data.new_total_bonus, seededBonusTotal + 25, "Cumulative bonus total includes the new award");
        const afterBonus = mockServerHandle("GET", "/student/points", null, studentToken);
        assertEqual(afterBonus.data.current_points, 135, "Bonus is included in the monthly total");
        assert(afterBonus.data.ledger.some((entry) => entry.source === "bonus" && entry.points === 25), "The ledger shows the awarded bonus");

        const outsiderBonus = mockServerHandle(
          "POST",
          "/doctor/students/usr-5/bonus",
          { points: 10, reason: "Out of scope" },
          doctorToken
        );
        assertEqual(outsiderBonus.status, 403, "Doctor cannot award a student outside their course scope");

        setFakeClock("2026-11-01T00:00:00.000Z");
        const newMonth = mockServerHandle("GET", "/student/points", null, studentToken);
        assertEqual(newMonth.data.current_points, 0, "Prior-month points are excluded after the reset boundary");
        assertEqual(newMonth.data.current_month, "2026-11", "Ledger month follows the injected clock");
      } finally {
        clearFakeClock();
      }
    },
  },

  /* -------------------------------------------------------------
     Scenario 9: Anonymous Ratings & Cooldown
  ------------------------------------------------------------- */
  {
    id: "sc-9-ratings-anonymity-cooldown",
    title: "Scenario 9: Rating Validation, Cooldown, and Doctor Anonymity",
    category: "Ratings & Privacy",
    run: async () => {
      mockDb.resetToSeed();
      setFakeClock("2026-10-30T12:00:00.000Z");

      try {
        const studentToken = "aplus-mock-usr-1";
        const doctorToken = "aplus-mock-usr-6";
        const rating = {
          target_type: "lecture",
          target_id: "lec-a3",
          course_id: "crs-a",
          score: 4,
          comment: "Clear examples and a useful summary.",
        };
        const created = mockServerHandle("POST", "/student/ratings", rating, studentToken);
        assertEqual(created.status, 201, "Valid lecture rating is accepted");

        const repeat = mockServerHandle("POST", "/student/ratings", rating, studentToken);
        assertEqual(repeat.status, 429, "Rating the same target during cooldown is rejected");

        const invalidScore = mockServerHandle(
          "POST",
          "/student/ratings",
          { ...rating, target_id: "lec-a2", score: 6 },
          studentToken
        );
        assertEqual(invalidScore.status, 422, "Out-of-range rating is rejected");

        const unknownTarget = mockServerHandle(
          "POST",
          "/student/ratings",
          { ...rating, target_id: "lecture-does-not-exist" },
          studentToken
        );
        assertEqual(unknownTarget.status, 404, "Unknown rating target is rejected");

        const outOfScope = mockServerHandle(
          "POST",
          "/student/ratings",
          { ...rating, target_id: "lec-c1", course_id: "crs-c" },
          studentToken
        );
        assertEqual(outOfScope.status, 403, "Student cannot rate a lecture in a non-enrolled course");

        const doctorRatings = mockServerHandle("GET", "/doctor/ratings", null, doctorToken);
        assertEqual(doctorRatings.status, 200, "Doctor rating summary is available");
        assert(doctorRatings.data.anonymous_comments.some((comment) => comment.comment === rating.comment),
          "Doctor sees the comment in the aggregate feedback");
        assertEqual(scanForbiddenKeys(doctorRatings.data, /student_id|student_name/i).length, 0,
          "Doctor rating response contains no student identity");
      } finally {
        clearFakeClock();
      }
    },
  },

  /* -------------------------------------------------------------
     Scenario 10: Private To-Do CRUD
  ------------------------------------------------------------- */
  {
    id: "sc-10-todo-ownership-crud",
    title: "Scenario 10: To-Do CRUD Validation and Owner Isolation",
    category: "Personal Tasks & Privacy",
    run: async () => {
      mockDb.resetToSeed();
      const studentToken = "aplus-mock-usr-1";
      const otherStudentToken = "aplus-mock-usr-2";

      const invalidPriority = mockServerHandle(
        "POST",
        "/student/todos",
        { title: "Invalid priority", priority: "urgent" },
        studentToken
      );
      assertEqual(invalidPriority.status, 422, "Invalid priority is rejected with validation details");

      const outOfScopeCourse = mockServerHandle(
        "POST",
        "/student/todos",
        { title: "Unenrolled course", course_code: "SE302" },
        studentToken
      );
      assertEqual(outOfScopeCourse.status, 403, "Todo cannot reference a non-enrolled course");

      const created = mockServerHandle(
        "POST",
        "/student/todos",
        { title: "Review lecture notes", course_code: "SE301", due_date: "2026-11-05", priority: "high" },
        studentToken
      );
      assertEqual(created.status, 201, "Valid personal todo is created");
      assertEqual(created.data.student_id, "usr-1", "Created task belongs to the authenticated student");

      const otherStudentList = mockServerHandle("GET", "/student/todos", null, otherStudentToken);
      assert(!otherStudentList.data.some((todo) => todo.id === created.data.id), "Another student cannot list this task");

      const otherStudentUpdate = mockServerHandle(
        "PATCH",
        `/student/todos/${created.data.id}`,
        { completed: true },
        otherStudentToken
      );
      assertEqual(otherStudentUpdate.status, 404, "Another student cannot update this task");

      const updated = mockServerHandle(
        "PATCH",
        `/student/todos/${created.data.id}`,
        { completed: true, student_id: "usr-2" },
        studentToken
      );
      assertEqual(updated.status, 200, "Owner can update their task");
      assertEqual(updated.data.completed, true, "Completion state is updated");
      assertEqual(updated.data.student_id, "usr-1", "Update cannot transfer task ownership");

      const deleted = mockServerHandle("DELETE", `/student/todos/${created.data.id}`, null, studentToken);
      assertEqual(deleted.status, 204, "Owner can delete their task");
      const repeatedDelete = mockServerHandle("DELETE", `/student/todos/${created.data.id}`, null, studentToken);
      assertEqual(repeatedDelete.status, 404, "Deleted task is no longer available");
    },
  },

  /* -------------------------------------------------------------
     Scenario 11: Dashboard Aggregates
  ------------------------------------------------------------- */
  {
    id: "sc-11-dashboard-aggregates",
    title: "Scenario 11: Student and Doctor Dashboards Match Their Domain Data",
    category: "Dashboards & Aggregates",
    run: async () => {
      mockDb.resetToSeed();
      setFakeClock("2026-10-30T12:00:00.000Z");

      try {
        const studentToken = "aplus-mock-usr-1";
        const doctorToken = "aplus-mock-usr-6";
        const studentDashboard = mockServerHandle("GET", "/student/dashboard/summary", null, studentToken);
        const studentCourses = mockServerHandle("GET", "/student/courses", null, studentToken);
        const studentAssignments = mockServerHandle("GET", "/student/assignments", null, studentToken);
        const studentQuizzes = mockServerHandle("GET", "/student/quizzes", null, studentToken);
        const studentAttendance = mockServerHandle("GET", "/student/attendance", null, studentToken);
        const studentPoints = mockServerHandle("GET", "/student/points", null, studentToken);
        const unreadCount = mockServerHandle("GET", "/student/inbox/unread-count", null, studentToken);

        assertEqual(studentDashboard.status, 200, "Student dashboard is available");
        assertEqual(studentDashboard.data.enrolled_courses, studentCourses.data.length, "Enrolled course total matches the course list");
        assertEqual(studentDashboard.data.pending_assignments,
          studentAssignments.data.filter((assignment) => assignment.status === "pending").length,
          "Pending assignment total matches assignment states");
        assertEqual(studentDashboard.data.upcoming_quizzes,
          studentQuizzes.data.filter((quiz) => ["upcoming", "available"].includes(quiz.status)).length,
          "Upcoming quiz total matches quizzes not yet closed or attempted");
        assertEqual(studentDashboard.data.attendance_rate, studentAttendance.data.overall_percentage,
          "Dashboard attendance rate matches attendance summary");
        assertEqual(studentDashboard.data.points, studentPoints.data.current_points, "Dashboard points match the monthly ledger");
        assertEqual(studentDashboard.data.unread_messages, unreadCount.data.unread_count, "Unread messages match the inbox count");

        const doctorDashboard = mockServerHandle("GET", "/doctor/dashboard/summary", null, doctorToken);
        const doctorCourses = mockServerHandle("GET", "/doctor/courses", null, doctorToken);
        const doctorAssignments = mockServerHandle("GET", "/doctor/assignments", null, doctorToken);
        const pendingCount = mockServerHandle("GET", "/doctor/assignments/pending-count", null, doctorToken);
        const doctorStudents = mockServerHandle("GET", "/doctor/students", null, doctorToken);
        const doctorRatings = mockServerHandle("GET", "/doctor/ratings", null, doctorToken);

        assertEqual(doctorDashboard.status, 200, "Doctor dashboard is available");
        assertEqual(doctorDashboard.data.active_courses_count, doctorCourses.data.length, "Doctor course total matches owned courses");
        assertEqual(doctorDashboard.data.pending_submissions_to_grade, pendingCount.data.pending_count,
          "Dashboard grading count matches the pending badge endpoint");
        assertEqual(doctorDashboard.data.pending_submissions_to_grade,
          doctorAssignments.data.reduce((sum, assignment) => sum + assignment.pending_submissions, 0),
          "Pending grading total matches assignment submissions");
        assertEqual(doctorDashboard.data.total_enrolled_students,
          new Set(doctorStudents.data.map((student) => student.student_id)).size,
          "Doctor dashboard counts distinct enrolled students");
        assertEqual(doctorDashboard.data.average_student_rating, doctorRatings.data.breakdown[0].score,
          "Dashboard rating matches doctor rating aggregate");
        assert(Number.isInteger(doctorStudents.data[0]?.current_month_points), "Doctor roster rows include current-month points");
      } finally {
        clearFakeClock();
      }
    },
  },

  /* -------------------------------------------------------------
     Scenario 12: Database Persistence & Reset
  ------------------------------------------------------------- */
  {
    id: "sc-12-persistence",
    title: "Scenario 12: Database Persistence & Reset Functionality",
    category: "Storage & State",
    run: async () => {
      // 1. Reset to seed
      const seedState = mockDb.resetToSeed();
      assert(seedState.users.length > 0, "Seed snapshot contains users");

      // 2. Perform a mutation (create a new todo for student 1)
      const studentToken = "aplus-mock-usr-1";
      const todoPayload = {
        title: "Test Persistent Task #999",
        priority: "high",
        due_date: "2026-11-20",
      };
      const createRes = mockServerHandle("POST", "/student/todos", todoPayload, studentToken);
      assertEqual(createRes.status, 201, "Todo created with 201");
      const createdId = createRes.data.id;

      // 3. Verify it is persisted in localStorage raw string
      const rawStored = localStorage.getItem(MOCK_DB_KEY);
      assert(rawStored !== null, "Database exists in localStorage");
      assert(rawStored.includes("Test Persistent Task #999"), "Raw storage contains newly created todo");

      // 4. Verify reload loads from storage with mutation intact
      const reloadedDb = mockDb.load();
      const foundInDb = reloadedDb.todos.find((t) => t.id === createdId);
      assert(Boolean(foundInDb), "Reloaded database contains created task");
      assertEqual(foundInDb.title, "Test Persistent Task #999", "Task title matches");

      // 5. Test resetToSeed wipes mutations and restores pure seed state
      const freshReset = mockDb.resetToSeed();
      const foundAfterReset = freshReset.todos.find((t) => t.id === createdId);
      assert(!foundAfterReset, "Reset wipes transient todo");

      const rawAfterReset = localStorage.getItem(MOCK_DB_KEY);
      assert(!rawAfterReset.includes("Test Persistent Task #999"), "localStorage no longer has transient todo");
    },
  },

  /* -------------------------------------------------------------
     Scenario 13: Cross-Tab Sync
  ------------------------------------------------------------- */
  {
    id: "sc-13-cross-tab",
    title: "Scenario 13: Cross-Tab Sync via Storage & Custom Events",
    category: "Real-time & Sync",
    run: async () => {
      mockDb.resetToSeed();

      let changeEventCount = 0;
      const unlisten = mockDb.listenForChanges(() => {
        changeEventCount += 1;
      });

      try {
        // Trigger a database save (e.g. Doctor sends a message to Student 1)
        const doctorToken = "aplus-mock-usr-6";
        const messagePayload = {
          course_id: "crs-a",
          recipient_ids: ["usr-1"],
          type: "warning",
          subject: "Cross-tab Test Message",
          body: "Testing real-time update sync across open windows.",
        };
        const sendRes = mockServerHandle("POST", "/doctor/messages", messagePayload, doctorToken);
        assertEqual(sendRes.status, 201, "Message created by doctor");

        // A same-tab save notifies through the custom event, not the browser storage event.
        assertEqual(changeEventCount, 1, "Same-tab save invokes the custom-event listener once");

        if (typeof window.dispatchExternalStorageEvent === "function") {
          window.dispatchExternalStorageEvent(MOCK_DB_KEY);
        } else {
          window.dispatchEvent(new StorageEvent("storage", { key: MOCK_DB_KEY }));
        }
        assertEqual(changeEventCount, 2, "A cross-tab storage event invokes the storage listener");

        // Verify Student 1's unread count immediately reflects the new message
        const student1Token = "aplus-mock-usr-1";
        const unreadRes = mockServerHandle("GET", "/student/inbox/unread-count", null, student1Token);
        assertEqual(unreadRes.status, 200, "Unread count response");
        // Seed unread for student 1 was 3 (msg-2, msg-8, msg-9), now should be 4
        assertEqual(unreadRes.data.unread_count, 4, "Unread count incremented to 4");
      } finally {
        unlisten();
      }
    },
  },

  /* -------------------------------------------------------------
     Scenario 14: Admin Scope and Student Management
  ------------------------------------------------------------- */
  {
    id: "sc-14-admin-scope-students",
    title: "Scenario 14: Admin Scope and Student Account Management",
    category: "Department Admin",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const dept1AdminToken = "aplus-mock-usr-8";  // Rania Hatem (Computer Science)
      const dept2AdminToken = "aplus-mock-usr-11"; // Dina Essam (Information Systems)
      const deanToken       = "aplus-mock-usr-9";  // Hassan Ali (Super Admin / Dean)

      // 1. Dept 1 Admin reads dashboard summary for their department
      const summaryRes = mockServerHandle("GET", "/admin/dashboard/summary", null, dept1AdminToken);
      assertEqual(summaryRes.status, 200, "Dept 1 Admin dashboard returns 200");
      assertEqual(summaryRes.data.dept_name, "Computer Science", "Dashboard shows Computer Science");
      assert(summaryRes.data.student_count > 0, "Student count is populated");
      assert(summaryRes.data.doctor_count > 0, "Doctor count is populated");
      assert(summaryRes.data.course_count > 0, "Course count is populated");

      // 2. Dept 1 Admin creates a student in Computer Science
      const createPayload = {
        full_name: "Tarek Nour",
        email: "tarek@aplus.edu",
        university_id: "CS2023099",
      };
      const createRes = mockServerHandle("POST", "/admin/students", createPayload, dept1AdminToken);
      assertEqual(createRes.status, 201, "Student creation returns 201 Created");
      assert(Boolean(createRes.data.student?.id), "Student record returned with ID");
      assert(Boolean(createRes.data.temp_password), "Temporary password returned once in response");
      assertEqual(createRes.data.student.email, "tarek@aplus.edu", "Student email matches");

      // 3. Newly created student appears in Dept 1 Admin's student directory
      const listRes = mockServerHandle("GET", "/admin/students", null, dept1AdminToken);
      assertEqual(listRes.status, 200, "Dept 1 Admin gets students list");
      assert(listRes.data.some((s) => s.id === createRes.data.student.id), "New student appears in Dept 1 student directory");

      // 4. Dept 2 Admin cannot see Dept 1 students (department isolation)
      const dept2ListRes = mockServerHandle("GET", "/admin/students", null, dept2AdminToken);
      assertEqual(dept2ListRes.status, 200, "Dept 2 Admin gets students list");
      assert(!dept2ListRes.data.some((s) => s.id === "usr-1"), "Dept 2 Admin cannot see Dept 1 student Karim Adel (usr-1)");
      assert(!dept2ListRes.data.some((s) => s.id === createRes.data.student.id), "Dept 2 Admin cannot see newly created student");

      // 5. Cross-role boundary: Dept Admin cannot access Dean routes (403)
      const adminOnDean = mockServerHandle("GET", "/dean/overview/summary", null, dept1AdminToken);
      assertEqual(adminOnDean.status, 403, "Dept Admin accessing Dean overview returns 403 Forbidden");

      // 6. Cross-role boundary: Dean cannot access Dept Admin routes (403)
      const deanOnAdmin = mockServerHandle("GET", "/admin/dashboard/summary", null, deanToken);
      assertEqual(deanOnAdmin.status, 403, "Dean accessing Dept Admin dashboard returns 403 Forbidden");

      // 7. Deactivate and reactivate student
      const deactRes = mockServerHandle("POST", `/admin/students/${createRes.data.student.id}/deactivate`, null, dept1AdminToken);
      assertEqual(deactRes.status, 200, "Deactivate returns 200");
      assertEqual(deactRes.data.disabled, true, "Student marked disabled");

      // Disabled student login attempt returns 403
      const disabledLogin = mockServerHandle("POST", "/auth/login", { identifier: "tarek@aplus.edu", password: createRes.data.temp_password }, null);
      assertEqual(disabledLogin.status, 403, "Disabled student cannot log in");

      // Reactivate student
      const reactRes = mockServerHandle("POST", `/admin/students/${createRes.data.student.id}/reactivate`, null, dept1AdminToken);
      assertEqual(reactRes.status, 200, "Reactivate returns 200");
      assertEqual(reactRes.data.disabled, false, "Student marked active");
    },
  },

  /* -------------------------------------------------------------
     Scenario 15: Admin Course and Enrollment Management
  ------------------------------------------------------------- */
  {
    id: "sc-15-admin-course-enrollment",
    title: "Scenario 15: Admin Course and Enrollment Management",
    category: "Department Admin",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const dept1AdminToken = "aplus-mock-usr-8";  // Computer Science
      const dept2AdminToken = "aplus-mock-usr-11"; // Information Systems

      // 1. Dept 1 Admin creates course in Computer Science assigned to Doctor 1 (usr-6)
      const coursePayload = {
        code: "CS401",
        title: "Distributed Systems Architecture",
        doctor_id: "usr-6",
        credit_hours: 3,
        total_lectures: 14,
        schedule: "Sun & Tue 09:00–10:30",
        room: "Hall 2C",
        color: "#2563eb",
      };
      const createCourseRes = mockServerHandle("POST", "/admin/courses", coursePayload, dept1AdminToken);
      assertEqual(createCourseRes.status, 201, "Course creation returns 201 Created");
      const courseId = createCourseRes.data.id;
      assert(Boolean(courseId), "Created course has an ID");
      assertEqual(createCourseRes.data.code, "CS401", "Course code matches");

      // 2. Dept 1 Admin enrolls Student 1 (Karim Adel, usr-1) into the course
      const enrollRes = mockServerHandle("POST", `/admin/courses/${courseId}/enroll`, { student_id: "usr-1" }, dept1AdminToken);
      assertEqual(enrollRes.status, 201, "Enrollment returns 201 Created");
      assert(Boolean(enrollRes.data.id), "Enrollment ID created");

      // 3. Duplicate enrollment attempt returns 409 Conflict
      const dupEnrollRes = mockServerHandle("POST", `/admin/courses/${courseId}/enroll`, { student_id: "usr-1" }, dept1AdminToken);
      assertEqual(dupEnrollRes.status, 409, "Duplicate enrollment returns 409 Conflict");

      // 4. Unenroll student returns 200
      const unenrollRes = mockServerHandle("DELETE", `/admin/courses/${courseId}/enroll/usr-1`, null, dept1AdminToken);
      assertEqual(unenrollRes.status, 200, "Unenroll returns 200 OK");

      // 5. Cross-department enrollment rejection: Dept 2 Admin cannot enroll a student into Dept 1 course
      const crossEnrollRes = mockServerHandle("POST", `/admin/courses/${courseId}/enroll`, { student_id: "usr-13" }, dept2AdminToken);
      assertEqual(crossEnrollRes.status, 403, "Cross-department enrollment returns 403 Forbidden");

      // 6. Admin cannot assign a doctor from another department to a course
      const invalidDoctorCourse = {
        code: "CS402",
        title: "Cloud Native Computing",
        doctor_id: "usr-12", // Belongs to dept-2 (Information Systems)
        credit_hours: 3,
      };
      const invalidDocRes = mockServerHandle("POST", "/admin/courses", invalidDoctorCourse, dept1AdminToken);
      assertEqual(invalidDocRes.status, 422, "Assigning doctor from another department returns 422");
    },
  },

  /* -------------------------------------------------------------
     Scenario 16: Dean Department Creation and Overview
  ------------------------------------------------------------- */
  {
    id: "sc-16-dean-departments-overview",
    title: "Scenario 16: Dean Department Creation, Management & Overview",
    category: "College Dean",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const deanToken = "aplus-mock-usr-9"; // Hassan Ali (Dean)

      // 1. Dean lists existing departments
      const initialDeptsRes = mockServerHandle("GET", "/dean/departments", null, deanToken);
      assertEqual(initialDeptsRes.status, 200, "Dean can fetch departments");
      const initialCount = initialDeptsRes.data.length;
      assert(initialCount >= 2, "At least CS and IS departments exist in seed");

      // 2. Dean creates a new department with an initial administrator
      const newDeptPayload = {
        name: "Artificial Intelligence",
        code: "AI",
        admin_full_name: "Sami Mansour",
        admin_email: "sami@aplus.edu",
        admin_university_id: "ADM2020003",
      };
      const createDeptRes = mockServerHandle("POST", "/dean/departments", newDeptPayload, deanToken);
      assertEqual(createDeptRes.status, 201, "Department creation returns 201 Created");
      assert(Boolean(createDeptRes.data.department?.id), "Department entity created");
      assert(Boolean(createDeptRes.data.admin?.id), "Admin user entity created");
      assert(Boolean(createDeptRes.data.temp_password), "Temporary password returned once for new admin");

      // 3. The new department is included in subsequent department listings
      const updatedDeptsRes = mockServerHandle("GET", "/dean/departments", null, deanToken);
      assertEqual(updatedDeptsRes.status, 200, "Updated departments fetched");
      assertEqual(updatedDeptsRes.data.length, initialCount + 1, "Department count incremented by 1");
      assert(updatedDeptsRes.data.some((d) => d.code === "AI"), "New AI department appears in list");

      // 4. College overview summary reflects the new department count
      const overviewRes = mockServerHandle("GET", "/dean/overview/summary", null, deanToken);
      assertEqual(overviewRes.status, 200, "Dean overview summary returns 200");
      assertEqual(overviewRes.data.dept_count, initialCount + 1, "Overview reflects updated department count");
      assert(overviewRes.data.total_students > 0, "Total students reported in overview");

      // 5. Duplicate department code returns 409 Conflict
      const dupCodeRes = mockServerHandle("POST", "/dean/departments", {
        name: "Applied AI",
        code: "AI",
        admin_full_name: "Second Admin",
        admin_email: "second@aplus.edu",
        admin_university_id: "ADM2020004",
      }, deanToken);
      assertEqual(dupCodeRes.status, 409, "Duplicate department code returns 409 Conflict");

      // 6. Dean can view specific department detail
      const detailRes = mockServerHandle("GET", `/dean/departments/${createDeptRes.data.department.id}`, null, deanToken);
      assertEqual(detailRes.status, 200, "Department detail returns 200");
      assertEqual(detailRes.data.dept_name, "Artificial Intelligence", "Department name matches");
    },
  },

  /* -------------------------------------------------------------
     Scenario 20: Admin Metrics, Attendance, and Points Scope
  ------------------------------------------------------------- */
  {
    id: "sc-20-admin-metrics-attendance-points",
    title: "Scenario 20: Admin Dashboard, Attendance, and Monthly Points Scope",
    category: "Department Admin",
    run: async () => {
      mockDb.resetToSeed();
      setFakeClock("2026-10-30T12:00:00Z");

      const token = "aplus-mock-usr-8";
      const db = mockDb.load();
      const departmentId = "dept-1";
      const activeStudents = db.users.filter((user) => user.role === "student" && user.department_id === departmentId && !user.disabled);
      const activeDoctors = db.users.filter((user) => user.role === "doctor" && user.department_id === departmentId && !user.disabled);
      const courses = db.courses.filter((course) => course.department_id === departmentId);
      const courseIds = courses.map((course) => course.id);
      const sessionIds = db.attendance_sessions.filter((session) => courseIds.includes(session.course_id)).map((session) => session.id);
      const records = db.attendance_records.filter((record) => sessionIds.includes(record.session_id));
      const expectedRate = Math.round((records.filter((record) => record.status === "present").length / records.length) * 1000) / 10;

      const dashboard = mockServerHandle("GET", "/admin/dashboard/summary", null, token);
      assertEqual(dashboard.status, 200, "Admin dashboard returns 200");
      assertEqual(dashboard.data.student_count, activeStudents.length, "Dashboard student count matches seeded department");
      assertEqual(dashboard.data.doctor_count, activeDoctors.length, "Dashboard doctor count matches seeded department");
      assertEqual(dashboard.data.course_count, courses.length, "Dashboard course count matches seeded department");
      assertEqual(dashboard.data.avg_attendance_rate, expectedRate, "Dashboard attendance rate matches seeded records");
      assert(dashboard.data.at_risk_students.every((student) => activeStudents.some((item) => item.id === student.id)), "Dashboard at-risk list is department-scoped");

      const attendance = mockServerHandle("GET", "/admin/attendance", null, token);
      assertEqual(attendance.status, 200, "Admin attendance overview returns 200");
      assertEqual(attendance.data.length, courses.length, "Attendance overview contains only department courses");
      for (const course of courses) {
        const expectedSessions = db.attendance_sessions.filter((session) => session.course_id === course.id);
        const expectedRecords = db.attendance_records.filter((record) => expectedSessions.some((session) => session.id === record.session_id));
        const expectedCourseRate = Math.round((expectedRecords.filter((record) => record.status === "present").length / expectedRecords.length) * 1000) / 10;
        const expectedRisk = db.enrollments.filter((enrollment) => enrollment.course_id === course.id).filter((enrollment) => expectedRecords.filter((record) => record.student_id === enrollment.student_id && record.status === "absent").length >= db.settings.absence_warning_threshold).length;
        const actual = attendance.data.find((item) => item.course_id === course.id);
        assert(Boolean(actual), `Attendance overview includes ${course.code}`);
        assertEqual(actual.avg_attendance_rate, expectedCourseRate, `${course.code} attendance rate matches seed`);
        assertEqual(actual.at_risk_count, expectedRisk, `${course.code} at-risk count uses settings threshold`);
      }

      const assertMonthlyLeaderboard = (month, label) => {
        const response = mockServerHandle("GET", "/admin/points", null, token);
        assertEqual(response.status, 200, `${label} admin points returns 200`);
        const expected = activeStudents.map((student) => ({
          student_id: student.id,
          points: db.points_ledger.filter((entry) => entry.student_id === student.id && entry.month === month).reduce((total, entry) => total + entry.points, 0),
        })).sort((left, right) => right.points - left.points);
        assertEqual(JSON.stringify(response.data.map((entry) => ({ student_id: entry.student_id, points: entry.points }))), JSON.stringify(expected), `${label} ranking matches seeded ledger`);
        assert(response.data.slice(0, 3).every((entry) => activeStudents.some((student) => student.id === entry.student_id)), `${label} top three excludes other departments`);
      };

      assertMonthlyLeaderboard("2026-10", "Current-month");
      setFakeClock("2026-09-30T12:00:00Z");
      assertMonthlyLeaderboard("2026-09", "Previous-month");
      clearFakeClock();
    },
  },

  /* -------------------------------------------------------------
     Scenario 21: Admin Broadcasts and Inbox State
  ------------------------------------------------------------- */
  {
    id: "sc-21-admin-messages-inbox",
    title: "Scenario 21: Admin Department Broadcasts, Sent Counts, and Inbox Read State",
    category: "Department Admin",
    run: async () => {
      mockDb.resetToSeed();
      setFakeClock("2026-10-30T12:00:00Z");

      const token = "aplus-mock-usr-8";
      const db = mockDb.load();
      const expectedRecipients = {
        students: db.users.filter((user) => user.role === "student" && user.department_id === "dept-1" && !user.disabled).map((user) => user.id),
        doctors: db.users.filter((user) => user.role === "doctor" && user.department_id === "dept-1" && !user.disabled).map((user) => user.id),
        both: db.users.filter((user) => ["student", "doctor"].includes(user.role) && user.department_id === "dept-1" && !user.disabled).map((user) => user.id),
        course: db.enrollments.filter((enrollment) => enrollment.course_id === "crs-a").map((enrollment) => enrollment.student_id),
      };

      for (const [recipientType, recipients] of Object.entries(expectedRecipients)) {
        const subject = `Admin ${recipientType} notice`;
        const payload = { recipient_type: recipientType, course_id: recipientType === "course" ? "crs-a" : undefined, subject, body: "Department update", type: "notice" };
        const sent = mockServerHandle("POST", "/admin/messages", payload, token);
        assertEqual(sent.status, 201, `${recipientType} broadcast is created`);
        assertEqual(sent.data.sent_count, recipients.length, `${recipientType} broadcast recipient count matches scope`);
        const created = mockDb.load().messages.filter((message) => message.subject === subject);
        assertEqual(created.length, recipients.length, `${recipientType} creates one message per recipient`);
        assert(created.every((message) => recipients.includes(message.recipient_id) && !message.is_read && message.sender_name === "Rania Hatem" && message.sender_type === "admin"), `${recipientType} messages preserve admin identity and unread state`);
      }

      const foreignCourse = mockServerHandle("POST", "/admin/messages", { recipient_type: "course", course_id: "crs-d", subject: "Forbidden", body: "No delivery" }, token);
      assertEqual(foreignCourse.status, 403, "Admin cannot target another department course");

      const sentList = mockServerHandle("GET", "/admin/messages", null, token);
      assertEqual(sentList.status, 200, "Admin sent list returns 200");
      assert(sentList.data.every((broadcast) => typeof broadcast.recipient_count === "number"), "Admin sent list includes recipient counts");

      const inbound = { id: "msg-admin-inbound", sender_id: "usr-9", sender_type: "admin", sender_name: "Hassan Ali", recipient_id: "usr-8", type: "notice", subject: "Dean update", body: "Please review the department report.", created_at: "2026-10-30T12:00:00.000Z", is_read: false };
      const dbWithInboxMessage = mockDb.load();
      dbWithInboxMessage.messages.push(inbound);
      mockDb.save(dbWithInboxMessage);
      const unread = mockServerHandle("GET", "/admin/inbox/unread-count", null, token);
      assertEqual(unread.status, 200, "Admin unread count returns 200");
      assertEqual(unread.data.unread_count, 1, "Admin unread count includes inbound message");
      const markRead = mockServerHandle("PUT", `/admin/inbox/${inbound.id}/read`, null, token);
      assertEqual(markRead.status, 200, "Admin can mark own inbox message read");
      assertEqual(mockServerHandle("GET", "/admin/inbox/unread-count", null, token).data.unread_count, 0, "Admin unread count decreases after mark-read");
      clearFakeClock();
    },
  },

  /* -------------------------------------------------------------
     Scenario 22: Admin Settings Authorization
  ------------------------------------------------------------- */
  {
    id: "sc-22-admin-settings-authorization",
    title: "Scenario 22: Admin Settings Read Access and Dean-only Validation",
    category: "Department Admin",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const adminToken = "aplus-mock-usr-8";
      const deanToken = "aplus-mock-usr-9";
      const settings = mockServerHandle("GET", "/admin/settings", null, adminToken);
      assertEqual(settings.status, 200, "Admin can read institutional settings");
      assertEqual(settings.data.absence_warning_threshold, mockDb.load().settings.absence_warning_threshold, "Admin settings reflect database values");
      const forbiddenWrite = mockServerHandle("PATCH", "/dean/settings", { absence_warning_threshold: 3 }, adminToken);
      assertEqual(forbiddenWrite.status, 403, "Admin cannot write dean-only settings");
      const invalidDeanWrite = mockServerHandle("PATCH", "/dean/settings", { absence_warning_threshold: 0, rating_cooldown_days: "bad" }, deanToken);
      assertEqual(invalidDeanWrite.status, 422, "Dean receives validation details for invalid settings");
    },
  },

  /* -------------------------------------------------------------
     Scenario 23: Admin List Endpoint Scope and Leak Scan
  ------------------------------------------------------------- */
  {
    id: "sc-23-admin-list-scope-leak-scan",
    title: "Scenario 23: Admin List Endpoint Department Scope and Sensitive-data Scan",
    category: "Department Admin",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      const admins = [
        { token: "aplus-mock-usr-8", departmentId: "dept-1" },
        { token: "aplus-mock-usr-11", departmentId: "dept-2" },
      ];
      const listPaths = ["/admin/students", "/admin/doctors", "/admin/courses", "/admin/attendance", "/admin/points", "/admin/messages", "/admin/inbox"];
      for (const admin of admins) {
        const db = mockDb.load();
        const scopedStudents = db.users.filter((user) => user.role === "student" && user.department_id === admin.departmentId).map((user) => user.id);
        const scopedDoctors = db.users.filter((user) => user.role === "doctor" && user.department_id === admin.departmentId).map((user) => user.id);
        const scopedCourses = db.courses.filter((course) => course.department_id === admin.departmentId).map((course) => course.id);
        for (const path of listPaths) {
          const response = mockServerHandle("GET", path, null, admin.token);
          assertEqual(response.status, 200, `${path} is available to its department admin`);
          assertEqual(scanForbiddenKeys(response.data, /ai_score/i).length, 0, `${path} does not expose an AI score`);
          assertEqual(scanForbiddenKeys(response.data, /ratings?\\.student_id/i).length, 0, `${path} does not expose student identity in rating data`);
          if (path === "/admin/students") assert(response.data.every((student) => scopedStudents.includes(student.id)), "Student list is department-scoped");
          if (path === "/admin/doctors") assert(response.data.every((doctor) => scopedDoctors.includes(doctor.id)), "Doctor list is department-scoped");
          if (path === "/admin/courses") assert(response.data.every((course) => scopedCourses.includes(course.id)), "Course list is department-scoped");
          if (path === "/admin/attendance") assert(response.data.every((course) => scopedCourses.includes(course.course_id)), "Attendance list is department-scoped");
          if (path === "/admin/points") assert(response.data.every((entry) => scopedStudents.includes(entry.student_id)), "Points list is department-scoped");
        }
      }
    },
  },

  /* -------------------------------------------------------------
     Scenario 19: Shell Navigation Integrity
     Verifies that every sidebar nav href resolves to a real HTML
     file under the correct role folder, that profile.html exists
     for all four roles, and that the admin/dean profile API
     endpoints return 200 with the authenticated user's data.
  ------------------------------------------------------------- */
  {
    id: "sc-19-shell-navigation-integrity",
    title: "Scenario 19: Shell Navigation Integrity – Nav Hrefs, Profile Pages & Profile API",
    category: "Shell & Navigation",
    run: async () => {
      mockDb.resetToSeed();
      clearFakeClock();

      /* ── 1. API: admin profile returns 200 with correct fields ── */
      // dept@aplus.edu is usr-8, token follows the aplus-mock-{id} convention
      const adminToken = "aplus-mock-usr-8";
      const adminProfileRes = mockServerHandle("GET", "/admin/profile", null, adminToken);
      assertEqual(adminProfileRes.status, 200, "GET /admin/profile returns 200");
      assert(typeof adminProfileRes.data.full_name === "string" && adminProfileRes.data.full_name.length > 0, "Admin profile has full_name");
      assert(typeof adminProfileRes.data.email === "string", "Admin profile has email");
      assertEqual(adminProfileRes.data.role, "department_admin", "Admin profile role is department_admin");

      /* ── 2. API: dean profile returns 200 with correct fields ── */
      // dean@aplus.edu is usr-9
      const deanToken = "aplus-mock-usr-9";
      const deanProfileRes = mockServerHandle("GET", "/dean/profile", null, deanToken);
      assertEqual(deanProfileRes.status, 200, "GET /dean/profile returns 200");
      assert(typeof deanProfileRes.data.full_name === "string" && deanProfileRes.data.full_name.length > 0, "Dean profile has full_name");
      assert(typeof deanProfileRes.data.email === "string", "Dean profile has email");
      assertEqual(deanProfileRes.data.role, "super_admin", "Dean profile role is super_admin");

      /* ── 3. File existence: only verifiable in Node (skipped in browser) ── */
      // In the browser, typeof process is 'undefined'; the check is omitted so
      // the scenario still runs green in the in-browser test runner.
      if (typeof process !== "undefined" && process.versions?.node) {
        // Dynamic import keeps this scenario importable in the browser where
        // node:fs does not exist; the import never executes there.
        const { existsSync } = await import("node:fs");
        const { resolve, dirname } = await import("node:path");
        const { fileURLToPath } = await import("node:url");

        // Resolve the project root relative to this file's location:
        // js/dev/test-scenarios.js → ../../ = project root
        const thisFile = fileURLToPath(import.meta.url);
        const projectRoot = resolve(dirname(thisFile), "../../");

        /**
         * Checks that every href listed in a nav array resolves to an existing
         * file under `folder/` beneath the project root.
         *
         * @param {Array<{href: string}>} navItems - Navigation spec array.
         * @param {string} folder - Role folder name (e.g. "student").
         */
        function assertNavFilesExist(navItems, folder) {
          for (const item of navItems) {
            const filePath = resolve(projectRoot, folder, item.href);
            assert(
              existsSync(filePath),
              `Nav href "${item.href}" does not exist at ${folder}/${item.href}`
            );
          }
        }

        // Import nav arrays directly (no browser-global shims needed in Node)
        const { STUDENT_NAV_ITEMS } = await import("../config/student-nav.js");
        const { DOCTOR_NAV_ITEMS } = await import("../config/doctor-nav.js");
        const { ADMIN_NAV_ITEMS } = await import("../config/admin-nav.js");
        const { DEAN_NAV_ITEMS } = await import("../config/dean-nav.js");

        // Check every sidebar link for each role resolves to a real HTML file
        assertNavFilesExist(STUDENT_NAV_ITEMS, "student");
        assertNavFilesExist(DOCTOR_NAV_ITEMS, "doctor");
        assertNavFilesExist(ADMIN_NAV_ITEMS, "department-admin");
        assertNavFilesExist(DEAN_NAV_ITEMS, "super-admin");

        // Profile pages sit outside the sidebar nav – verify them explicitly
        const profilePaths = [
          ["student", "profile.html"],
          ["doctor", "profile.html"],
          ["department-admin", "profile.html"],
          ["super-admin", "profile.html"],
        ];
        for (const [folder, file] of profilePaths) {
          const filePath = resolve(projectRoot, folder, file);
          assert(existsSync(filePath), `profile.html missing for role folder "${folder}"`);
        }
      }
    },
  },
];
