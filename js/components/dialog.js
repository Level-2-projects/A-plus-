/**
 * js/components/dialog.js – Native accessible confirmation dialog.
 * Uses <dialog> to provide focus containment and Escape behavior.
 * Depends on: css/components.css, js/config/strings.js.
 */

import { STRINGS } from "../config/strings.js";

/** Resolves true on confirmation and false on cancellation. */
export function confirmDialog({ title, message, confirmLabel, cancelLabel } = {}) {
  const previouslyFocused = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";
  dialog.setAttribute("aria-labelledby", "confirm-dialog-title");
  dialog.innerHTML = `
    <form method="dialog" class="confirm-dialog__form">
      <h2 id="confirm-dialog-title"></h2>
      <p class="confirm-dialog__message"></p>
      <div class="confirm-dialog__actions">
        <button class="btn btn-secondary" value="cancel"></button>
        <button class="btn btn-primary" value="confirm"></button>
      </div>
    </form>`;
  dialog.querySelector("#confirm-dialog-title").textContent = title || STRINGS.dialog.title;
  dialog.querySelector(".confirm-dialog__message").textContent = message || "";
  dialog.querySelector('[value="cancel"]').textContent = cancelLabel || STRINGS.dialog.cancel;
  dialog.querySelector('[value="confirm"]').textContent = confirmLabel || STRINGS.dialog.confirm;
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  document.body.append(dialog);
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "confirm");
      dialog.remove();
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    }, { once: true });
  });
}
