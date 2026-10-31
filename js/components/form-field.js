/**
 * js/components/form-field.js – Labelled form fields and API validation mapping.
 * Depends on: css/components.css.
 */

let fieldSequence = 0;

/** Creates a field wrapper with associated label and inline error output. */
export function createFormField({ label, name, type = "text", required = false, multiline = false, options = [] }) {
  const wrapper = document.createElement("div");
  wrapper.className = "form-field";
  const id = `field-${name}-${fieldSequence}`;
  fieldSequence += 1;
  const caption = document.createElement("label");
  caption.htmlFor = id;
  caption.textContent = label;
  let control;
  if (options.length) {
    control = document.createElement("select");
    control.className = "input";
    options.forEach(({ value, text }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      control.append(option);
    });
  } else {
    control = document.createElement(multiline ? "textarea" : "input");
    if (!multiline) control.type = type;
    control.className = multiline ? "input input--multiline" : "input";
  }
  control.id = id;
  control.name = name;
  control.required = required;
  const error = document.createElement("small");
  error.className = "field-error";
  error.id = `${id}-error`;
  error.hidden = true;
  control.setAttribute("aria-describedby", error.id);
  wrapper.append(caption, control, error);
  return wrapper;
}

/** Maps a 422 API message to an inline field error or a form-level message. */
export function showFieldErrors(form, error, formMessage) {
  form.querySelectorAll(".field-error").forEach((node) => {
    node.hidden = true;
    node.textContent = "";
  });
  form.querySelectorAll("[aria-invalid='true']").forEach((node) => node.removeAttribute("aria-invalid"));
  const message = String(error?.message || "");
  const details = error?.details && typeof error.details === "object" ? error.details : {};
  const [fieldName, fieldMessage] = Object.entries(details)[0] || [];
  const field = [...form.elements].find((element) => element.name === fieldName);
  if (error?.status === 422 && field) {
    const output = form.querySelector(`#${CSS.escape(field.id)}-error`);
    if (output) {
      output.textContent = String(fieldMessage);
      output.hidden = false;
      field.setAttribute("aria-invalid", "true");
      field.focus();
      return;
    }
  }
  formMessage.textContent = message || String(fieldMessage || "");
  formMessage.hidden = false;
}
