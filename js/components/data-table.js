/**
 * js/components/data-table.js – Responsive semantic table renderer.
 * Cell values are inserted as text; renderers may supply safe DOM nodes.
 * Depends on: css/components.css.
 */

/** Creates a labelled scrollable table from columns and row data. */
export function createDataTable({ columns, rows, label, emptyMessage }) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll";
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", label);
  wrapper.tabIndex = 0;
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "table-empty";
    empty.textContent = emptyMessage;
    wrapper.append(empty);
    return wrapper;
  }
  const table = document.createElement("table");
  table.className = "data-table";
  const head = table.createTHead().insertRow();
  columns.forEach((column) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = column.label;
    head.append(cell);
  });
  const body = table.createTBody();
  rows.forEach((row) => {
    const tr = body.insertRow();
    columns.forEach((column) => {
      const cell = tr.insertCell();
      const value = column.render ? column.render(row) : row[column.key];
      if (value instanceof Node) cell.append(value);
      else cell.textContent = value == null ? "" : String(value);
    });
  });
  wrapper.append(table);
  return wrapper;
}
