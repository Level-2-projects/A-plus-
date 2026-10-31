/**
 * js/mock/mock-ai.js – Mock AI assessment engine for student assignment submissions.
 * Generates deterministic feedback and a confidential doctor-only preliminary score.
 * Designed as a standalone adapter that can be replaced by an external service (e.g. n8n webhook / LLM service).
 *
 * Depends on: Nothing.
 */

const AI_FEEDBACK_TEMPLATES = [
  "Good structure overall. The core concept is well-addressed. Consider improving error handling.",
  "Solid understanding demonstrated. The implementation is clean; edge cases need more coverage.",
  "Strong theoretical foundation. Practical application could be more detailed.",
  "The design is sound and follows best practices. Documentation could be expanded.",
  "Excellent work! All requirements met with attention to detail. Minor style improvements suggested.",
  "Good effort. The logic is correct but the organisation could be cleaner.",
  "Clear reasoning throughout. Some areas lack depth – consider revisiting the specification.",
  "The solution is functional and well-structured. Performance considerations are missing.",
];

/**
 * Evaluates an assignment submission and produces deterministic feedback and a preliminary score.
 *
 * Integration contract:
 *  - score_out_of_10: Strictly confidential to the doctor; must NEVER be exposed to student endpoints.
 *  - feedback_summary: Immediately visible to the student upon submission.
 *  - confidence: Metric indicating evaluation certainty (0.00 to 1.00).
 *
 * @param {string} studentId - Unique identifier of the student.
 * @param {string} assignmentId - Unique identifier of the assignment.
 * @param {string} [content=""] - The submitted assignment solution content.
 * @returns {{ score_out_of_10: number, feedback_summary: string, confidence: number }}
 */
export function evaluateSubmission(studentId, assignmentId, content = "") {
  // Deterministic seed derived from student, assignment, and content length
  const textSeed = `${studentId}:${assignmentId}:${content.length}`;
  const hash = textSeed.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffff, 0);

  const score = 5.0 + ((hash % 50) / 10); // 5.0 to 9.9
  const templateIdx = hash % AI_FEEDBACK_TEMPLATES.length;
  const confidence = 0.8 + ((hash % 18) / 100); // 0.80 to 0.97

  return {
    score_out_of_10: Math.round(score * 10) / 10,
    feedback_summary: AI_FEEDBACK_TEMPLATES[templateIdx],
    confidence: Math.round(confidence * 100) / 100,
  };
}
