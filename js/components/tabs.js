/**
 * js/components/tabs.js – Accessible single-selection filter tabs.
 * Depends on: css/components.css.
 */

/** Builds tabs and calls onChange with the selected tab value. */
export function createTabs(items, selected, onChange, label) {
  const list = document.createElement("div");
  list.className = "filter-tabs";
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", label);
  items.forEach((item, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "filter-tab";
    tab.id = `filter-tab-${index}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(item.value === selected));
    tab.tabIndex = item.value === selected ? 0 : -1;
    tab.textContent = item.label;
    tab.addEventListener("click", () => {
      list.querySelectorAll('[role="tab"]').forEach((current) => {
        current.setAttribute("aria-selected", "false");
        current.tabIndex = -1;
      });
      tab.setAttribute("aria-selected", "true");
      tab.tabIndex = 0;
      onChange(item.value);
    });
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...list.querySelectorAll('[role="tab"]')];
      const next = event.key === "Home" ? 0
        : event.key === "End" ? tabs.length - 1
          : (tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
    });
    list.append(tab);
  });
  return list;
}
