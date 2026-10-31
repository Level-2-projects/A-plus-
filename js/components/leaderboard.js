/**
 * js/components/leaderboard.js - Ranked top-three list with solid medal markers.
 * Depends on the established medal tokens in css/components.css.
 */

/** Creates an accessible ordered leaderboard from the points endpoint. */
export function createLeaderboard(entries, emptyMessage) {
  const list = document.createElement("ol");
  list.className = "leaderboard-list";
  if (!entries.length) {
    const empty = document.createElement("li");
    empty.textContent = emptyMessage;
    list.append(empty);
    return list;
  }
  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "leaderboard-item";
    const medal = document.createElement("span");
    medal.className = `medal medal--${["gold", "silver", "bronze"][entry.rank - 1] || "bronze"}`;
    medal.textContent = String(entry.rank);
    medal.setAttribute("aria-label", `Rank ${entry.rank}`);
    const name = document.createElement("strong");
    name.textContent = entry.name;
    const points = document.createElement("span");
    points.className = "tabular-nums";
    points.textContent = String(entry.points);
    item.append(medal, name, points);
    list.append(item);
  });
  return list;
}
