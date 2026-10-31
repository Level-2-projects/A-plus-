/**
 * js/doctor/quizzes.js - Doctor quiz creation, course list, and attempt results.
 * Depends on doctor quiz APIs and shared components.
 */

import { createDoctorQuiz, getDoctorCourse, getDoctorCourses, getDoctorQuizResults, getDoctorQuizzes } from "../api/doctor-api.js";
import { initDoctorPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
const quizId = new URLSearchParams(location.search).get("id");
let courses = [];

/** Mounts the doctor's quiz list, creation form, or selected results. */
async function start() {
  initDoctorPage("quizzes");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadQuizzes();
}

/** Loads the required course, quiz, and result data for the current route. */
async function loadQuizzes() {
  try {
    if (quizId) {
      const allQuizzes = await getDoctorQuizzes();
      const quiz = allQuizzes.find((entry) => entry.id === quizId);
      if (!quiz) throw new Error(STRINGS.quizzes.loadError);
      const [course, results] = await Promise.all([
        getDoctorCourse(quiz.course_id),
        getDoctorQuizResults(quiz.id),
      ]);
      renderResults(quiz, course, results.attempts);
      return;
    }
    [courses] = await Promise.all([getDoctorCourses()]);
    renderQuizList(await getDoctorQuizzes());
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.quizzes.loadError, loadQuizzes));
  }
}

/** Renders quiz creation and the doctor's existing quiz list. */
function renderQuizList(quizzes) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const title = document.createElement("h2");
  title.textContent = STRINGS.quizzes.title;
  page.append(title, createQuizForm());
  const listHeading = document.createElement("h3");
  listHeading.textContent = STRINGS.quizzes.title;
  const list = document.createElement("div");
  list.className = "card-list";
  if (!quizzes.length) list.append(createEmptyState(STRINGS.quizzes.noQuizzes));
  quizzes.forEach((quiz) => {
    const card = document.createElement("article");
    card.className = "card quiz-card";
    const heading = document.createElement("h3");
    heading.textContent = quiz.title;
    const status = createStatusDot(STRINGS.quizzes[quiz.status] || quiz.status, quiz.status === "active" ? "success" : quiz.status === "closed" ? "neutral" : "info");
    const course = document.createElement("p");
    course.textContent = `${STRINGS.quizzes.course}: ${quiz.course_code}`;
    const activity = document.createElement("p");
    activity.textContent = `${quiz.questions_count} ${STRINGS.quizzes.questions} · ${quiz.completed_count} / ${quiz.total_enrolled} ${STRINGS.quizzes.attempts}`;
    const date = document.createElement("p");
    date.textContent = `${STRINGS.quizzes.opens}: ${formatDate(quiz.available_from).absolute} · ${STRINGS.quizzes.closes}: ${formatDate(quiz.available_to).absolute}`;
    const average = document.createElement("p");
    average.className = "tabular-nums";
    average.textContent = `${STRINGS.quizzes.average}: ${quiz.average_score ?? STRINGS.shared.noItems}`;
    const link = document.createElement("a");
    link.className = "btn btn-secondary";
    link.href = `quiz.html?id=${encodeURIComponent(quiz.id)}`;
    link.textContent = STRINGS.quizzes.viewResults;
    card.append(heading, status, course, activity, date, average, link);
    list.append(card);
  });
  page.append(listHeading, list);
  root.append(page);
}

/** Builds the quiz creation form with addable question and option inputs. */
function createQuizForm() {
  const form = document.createElement("form");
  form.className = "card page-stack";
  const heading = document.createElement("h3");
  heading.textContent = STRINGS.quizzes.createTitle;
  const titleField = createFormField({ label: STRINGS.quizzes.quizTitle, name: "title", required: true });
  const courseField = createFormField({
    label: STRINGS.quizzes.course,
    name: "course_id",
    required: true,
    options: [
      { value: "", text: STRINGS.quizzes.courseSelect },
      ...courses.map((course) => ({ value: course.id, text: `${course.code} — ${course.title}` })),
    ],
  });
  const durationField = createFormField({ label: STRINGS.quizzes.duration, name: "duration_minutes", type: "number", required: true });
  durationField.querySelector("input").min = "1";
  durationField.querySelector("input").value = "20";
  const fromField = createFormField({ label: STRINGS.quizzes.availableFrom, name: "available_from", type: "datetime-local", required: true });
  const toField = createFormField({ label: STRINGS.quizzes.availableTo, name: "available_to", type: "datetime-local", required: true });
  const questions = document.createElement("div");
  questions.className = "quiz-question-list";
  questions.append(createQuestionEditor(1));
  const addQuestion = document.createElement("button");
  addQuestion.type = "button";
  addQuestion.className = "btn btn-secondary";
  addQuestion.textContent = STRINGS.quizzes.addQuestion;
  addQuestion.addEventListener("click", () => questions.append(createQuestionEditor(questions.children.length + 1)));
  const message = document.createElement("p");
  message.className = "form-message";
  message.hidden = true;
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-primary";
  submit.textContent = STRINGS.quizzes.create;
  form.append(heading, titleField, courseField, durationField, fromField, toField, questions, addQuestion, message, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const questionRows = [...questions.querySelectorAll(".quiz-question-editor")];
    const quizQuestions = questionRows.map((row) => ({
      text: row.querySelector('[name="question_text"]').value.trim(),
      options: [...row.querySelectorAll('[name="option"]')].map((input) => input.value.trim()),
      correct_index: Number(row.querySelector('[name="correct_index"]').value),
      points: 1,
    }));
    const payload = {
      title: String(formData.get("title")).trim(),
      course_id: String(formData.get("course_id")),
      duration_minutes: Number(formData.get("duration_minutes")),
      available_from: new Date(String(formData.get("available_from"))).toISOString(),
      available_to: new Date(String(formData.get("available_to"))).toISOString(),
      questions: quizQuestions,
    };
    submit.disabled = true;
    try {
      await createDoctorQuiz(payload);
      showToast(STRINGS.quizzes.created, { kind: "success" });
      await loadQuizzes();
    } catch (error) {
      showFieldErrors(form, error, message);
      submit.disabled = false;
    }
  });
  setDefaultWindow(fromField.querySelector("input"), toField.querySelector("input"));
  return form;
}

/** Creates one question editor with four options and a correct-answer selector. */
function createQuestionEditor(index) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "quiz-question quiz-question-editor";
  const legend = document.createElement("legend");
  legend.textContent = `${STRINGS.quizzes.question} ${index}`;
  const question = createFormField({ label: STRINGS.quizzes.question, name: "question_text", required: true, multiline: true });
  fieldset.append(legend, question);
  for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
    fieldset.append(createFormField({
      label: `${STRINGS.quizzes.option} ${optionIndex + 1}`,
      name: "option",
      required: true,
    }));
  }
  const correct = createFormField({
    label: STRINGS.quizzes.correctOption,
    name: "correct_index",
    required: true,
    options: [0, 1, 2, 3].map((value) => ({ value: String(value), text: `${STRINGS.quizzes.option} ${value + 1}` })),
  });
  fieldset.append(correct);
  return fieldset;
}

/** Sets a sensible future availability window for newly created quizzes. */
function setDefaultWindow(fromInput, toInput) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  fromInput.value = toLocalDateTime(now);
  toInput.value = toLocalDateTime(tomorrow);
}

/** Converts a date into the local datetime-local control's value format. */
function toLocalDateTime(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Renders an individual quiz's aggregate and per-attempt result table. */
function renderResults(quiz, course, attempts) {
  root.replaceChildren();
  setPageTitle(STRINGS.quizzes.results);
  const page = document.createElement("section");
  page.className = "page-stack";
  const back = document.createElement("a");
  back.href = "quizzes.html";
  back.textContent = STRINGS.quizzes.back;
  const summary = document.createElement("article");
  summary.className = "card page-stack";
  const title = document.createElement("h2");
  title.textContent = quiz.title;
  const courseLabel = document.createElement("p");
  courseLabel.textContent = `${course.code} — ${course.title}`;
  const average = document.createElement("p");
  average.className = "tabular-nums";
  average.textContent = `${STRINGS.quizzes.average}: ${quiz.average_score ?? STRINGS.shared.noItems}`;
  summary.append(title, courseLabel, average);
  const table = createDataTable({
    label: STRINGS.quizzes.results,
    emptyMessage: STRINGS.quizzes.noAttempts,
    rows: attempts,
    columns: [
      { key: "student_name", label: STRINGS.quizzes.student },
      { key: "submitted_at", label: STRINGS.quizzes.submittedAt, render: (row) => formatDate(row.submitted_at).absolute },
      { key: "score", label: STRINGS.quizzes.score, render: (row) => `${row.score} / ${row.total}` },
    ],
  });
  page.append(back, summary, table);
  root.append(page);
}

start();
