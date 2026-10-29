/**
 * login.js – UI logic of the login page.
 * Flow: validate input → call api.login → save session → redirect by role.
 */
import { login, saveSession, ApiError } from "./api.js";
import { ROLE_ROUTES, STORAGE_KEYS } from "./config.js";

/* ---------- DOM references ---------- */
const form        = document.getElementById("login-form");
const identifier  = document.getElementById("identifier");
const password    = document.getElementById("password");
const remember    = document.getElementById("remember");
const submitBtn   = document.getElementById("submit-btn");
const toggleBtn   = document.getElementById("toggle-password");
const formError   = document.getElementById("form-error");

/* ---------- Restore Remember Me on page load ---------- */
// لو المستخدم كان محدد Remember me بنرجع الـ identifier والـ password والـ checkbox متعلم تلقائياً
const savedIdentifier = localStorage.getItem(STORAGE_KEYS.rememberedId);
const savedPassword   = localStorage.getItem(STORAGE_KEYS.rememberedPassword);

if (savedIdentifier) {
  identifier.value = savedIdentifier;
  remember.checked = true;
  if (savedPassword) {
    password.value = savedPassword;
  } else {
    password.focus();
  }
}


/* ---------- Messages (all user-facing text in one place) ---------- */
const MESSAGES = {
  identifierRequired: "Enter your email or university ID.",
  passwordRequired:   "Enter your password.",
  invalidCredentials: "The email/ID or password is incorrect. Check them and try again.",
  accountDisabled:    "This account is disabled. Contact your college administrator.",
  network:            "Can't reach the server. Check your connection and try again.",
  unknown:            "Something went wrong. Try again in a moment.",
  unknownRole:        "Your account has no access level yet. Contact your college administrator.",
};

/* ---------- Small UI helpers ---------- */

/** Shows or clears the error under one input. Pass message=null to clear. */
function setFieldError(input, message) {
  const errorEl = document.getElementById(`${input.id}-error`);
  errorEl.textContent = message ?? "";
  errorEl.hidden = !message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

/** Shows or clears the form-level error box. */
function setFormError(message) {
  formError.textContent = message ?? "";
  formError.hidden = !message;
}

/** Disables the button while the request runs, to prevent double submits. */
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Signing in…" : "Sign in";
}

/* ---------- Validation ---------- */

/** Returns true if the form is valid; otherwise shows errors and focuses the first bad field. */
function validate() {
  const idMissing = identifier.value.trim() === "";
  const pwMissing = password.value === "";
  setFieldError(identifier, idMissing ? MESSAGES.identifierRequired : null);
  setFieldError(password,   pwMissing ? MESSAGES.passwordRequired   : null);
  if (idMissing) identifier.focus();
  else if (pwMissing) password.focus();
  return !idMissing && !pwMissing;
}

/** Turns any error into a message the user can act on. */
function messageFor(error) {
  if (!(error instanceof ApiError)) return MESSAGES.unknown;
  if (error.status === 401) return MESSAGES.invalidCredentials;
  if (error.status === 403) return MESSAGES.accountDisabled;
  if (error.status === 0)   return MESSAGES.network;
  return MESSAGES.unknown;
}

/* ---------- Events ---------- */

/** Show/hide password – بيبدل بين أيقونة العين المفتوحة والمغلقة. */
toggleBtn.addEventListener("click", () => {
  const isHidden = password.type === "password";
  password.type = isHidden ? "text" : "password";

  // hidden attribute مش موثوق على SVG – بنستخدم style.display مباشرة
  document.getElementById("icon-show").style.display = isHidden ? "none" : "block";
  document.getElementById("icon-hide").style.display = isHidden ? "block" : "none";

  toggleBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

/** Clear an input's error as soon as the user edits it. */
for (const input of [identifier, password]) {
  input.addEventListener("input", () => { setFieldError(input, null); setFormError(null); });
}

/** Main submit handler. */
form.addEventListener("submit", async (event) => {
  event.preventDefault();                 // stop the browser's default page reload
  setFormError(null);
  if (!validate()) return;

  setLoading(true);
  try {
    const session = await login(identifier.value.trim(), password.value);

    const target = ROLE_ROUTES[session.user.role];
    if (!target) { setFormError(MESSAGES.unknownRole); return; }   // role the frontend doesn't know

    // حفظ أو مسح بيانات الاعتماد (identifier & password) بناءً على خيار Remember me
    if (remember.checked) {
      localStorage.setItem(STORAGE_KEYS.rememberedId, identifier.value.trim());
      localStorage.setItem(STORAGE_KEYS.rememberedPassword, password.value);
    } else {
      localStorage.removeItem(STORAGE_KEYS.rememberedId);
      localStorage.removeItem(STORAGE_KEYS.rememberedPassword);
    }

    saveSession(session, remember.checked);
    window.location.assign(target);       // success: go to the dashboard of this role
  } catch (error) {
    setFormError(messageFor(error));
    password.value = "";                  // never keep a failed password in the field
    password.focus();
  } finally {
    setLoading(false);
  }
});
