/**
 * js/student/quizzes.js - Student quiz list, one-attempt forms, and results.
 * The student view never receives or renders answer keys from the mock API.
 */

import { attemptQuiz, getQuiz, getQuizzes } from "../api/student-api.js";
import { initStudentPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { confirmDialog } from "../components/dialog.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
const quizId = new URLSearchParams(location.search).get("id");

/** Mounts the quiz list or selected quiz and initializes page loading. */
async function start() {
  initStudentPage("quizzes");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadQuizzes();
}

/** Loads current student quiz data and presents a retryable failure state. */
async function loadQuizzes() {
  try {
    if (quizId) {
      renderQuiz(await getQuiz(quizId));
      return;
    }
    renderQuizList(await getQuizzes());
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.quizzes.loadError, loadQuizzes));
  }
}

/** Renders quiz cards with status, availability, score, and detail navigation. */
function renderQuizList(quizzes) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.quizzes.title;
  const list = document.createElement("div");
  list.className = "card-list";
  if (!quizzes.length) list.append(createEmptyState(STRINGS.quizzes.noQuizzes));
  quizzes.forEach((quiz) => {
    const card = document.createElement("article");
    card.className = "card quiz-card";
    const title = document.createElement("h3");
    title.textContent = quiz.title;
    const status = createStatusDot(STRINGS.quizzes[quiz.status] || quiz.status, quiz.status === "completed" ? "success" : quiz.status === "missed" ? "danger" : "info");
    const course = document.createElement("p");
    course.textContent = `${STRINGS.quizzes.course}: ${quiz.course_code}`;
    const time = document.createElement("p");
    time.textContent = `${STRINGS.quizzes.duration}: ${quiz.duration_minutes} ${STRINGS.quizzes.minutes} · ${STRINGS.quizzes.questions}: ${quiz.questions_count}`;
    const date = document.createElement("p");
    const from = formatDate(quiz.available_from);
    const to = formatDate(quiz.available_to);
    date.textContent = `${STRINGS.quizzes.opens}: ${from.absolute} · ${STRINGS.quizzes.closes}: ${to.absolute}`;
    card.append(title, status, course, time, date);
    if (quiz.score !== null) {
      const score = document.createElement("strong");
      score.className = "tabular-nums";
      score.textContent = `${STRINGS.quizzes.score}: ${quiz.score} / ${quiz.total_score}`;
      card.append(score);
    }
    const link = document.createElement("a");
    link.className = "btn btn-secondary";
    link.href = `quiz.html?id=${encodeURIComponent(quiz.id)}`;
    link.textContent = quiz.status === "available" ? STRINGS.quizzes.start : STRINGS.quizzes.openQuiz;
    card.append(link);
    list.append(card);
  });
  page.append(heading, list);
  root.append(page);
}

/** Renders an active attempt form or completed result for one quiz. */
function renderQuiz(quiz) {
  root.replaceChildren();
  setPageTitle(quiz.title);
  const page = document.createElement("section");
  page.className = "page-stack";
  const back = document.createElement("a");
  back.href = "quizzes.html";
  back.textContent = STRINGS.quizzes.back;
  const details = document.createElement("article");
  details.className = "card page-stack";
  const heading = document.createElement("h2");
  heading.textContent = quiz.title;
  const status = createStatusDot(STRINGS.quizzes[quiz.status] || quiz.status, quiz.status === "completed" ? "success" : quiz.status === "missed" ? "danger" : "info");
  const timing = document.createElement("p");
  timing.textContent = `${STRINGS.quizzes.duration}: ${quiz.duration_minutes} ${STRINGS.quizzes.minutes} · ${STRINGS.quizzes.questions}: ${quiz.questions_count}`;
  details.append(heading, status, timing);
  page.append(back, details);
  if (quiz.status === "completed") page.append(createResult(quiz));
  else if (quiz.status === "available" && Array.isArray(quiz.questions)) page.append(createAttemptForm(quiz));
  else page.append(createEmptyState(`${STRINGS.quizzes.opens}: ${formatDate(quiz.available_from).absolute}`));
  root.append(page);
}

/** Creates the one-time quiz attempt form using accessible radio groups. */
function createAttemptForm(quiz) {
  const form = document.createElement("form");
  form.className = "card page-stack";
  const title = document.createElement("h3");
  title.textContent = STRINGS.quizzes.start;
  const error = document.createElement("p");
  error.className = "form-message";
  error.setAttribute("role", "alert");
  error.hidden = true;
  quiz.questions.forEach((question, index) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "quiz-question";
    const legend = document.createElement("legend");
    legend.textContent = `${index + 1}. ${question.text}`;
    fieldset.append(legend);
    question.options.forEach((option, optionIndex) => {
      const label = document.createElement("label");
      label.className = "quiz-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `answer-${index}`;
      input.value = String(optionIndex);
      input.required = true;
      label.append(input, document.createTextNode(option));
      fieldset.append(label);
    });
    form.append(fieldset);
  });
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-primary";
  submit.textContent = STRINGS.quizzes.submit;
  form.prepend(title);
  form.append(error, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = quiz.questions.map((_question, index) => {
      const selected = form.querySelector(`input[name="answer-${index}"]:checked`);
      return selected ? Number(selected.value) : -1;
    });
    if (answers.some((answer) => answer < 0)) {
      error.textContent = STRINGS.quizzes.answerRequired;
      error.hidden = false;
      return;
    }
    const confirmed = await confirmDialog({
      title: STRINGS.quizzes.confirmTitle,
      message: STRINGS.quizzes.confirm,
      confirmLabel: STRINGS.quizzes.submit,
    });
    if (!confirmed) return;
    submit.disabled = true;
    try {
      await attemptQuiz(quiz.id, { answers });
      showToast(STRINGS.shared.success, { kind: "success" });
      await loadQuizzes();
    } catch (requestError) {
      error.textContent = requestError.status === 409 ? STRINGS.quizzes.alreadyAttempted : requestError.message;
      error.hidden = false;
      submit.disabled = false;
    }
  });
  return form;
}

/** Shows the student's score and only reveals correct answers if explicitly returned. */
function createResult(quiz) {
  const card = document.createElement("section");
  card.className = "card page-stack";
  const title = document.createElement("h3");
  title.textContent = STRINGS.quizzes.result;
  const score = document.createElement("p");
  score.className = "grading-panel__score tabular-nums";
  score.textContent = `${STRINGS.quizzes.score}: ${quiz.score} / ${quiz.total_score}`;
  card.append(title, score);
  if (Array.isArray(quiz.questions) && quiz.questions.some((question) => Number.isInteger(question.correct_index))) {
    const answersHeading = document.createElement("h4");
    answersHeading.textContent = STRINGS.quizzes.correctAnswers;
    card.append(answersHeading);
    quiz.questions.forEach((question) => {
      const answer = document.createElement("p");
      answer.textContent = `${question.text}: ${question.options[question.correct_index]}`;
      card.append(answer);
    });
  }
  return card;
}

start();
