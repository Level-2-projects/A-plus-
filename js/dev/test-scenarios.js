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
        due_date: "2026-11-25T23:59:00Z",
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
      clearFakeClock();

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
];
