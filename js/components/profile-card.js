/**
 * js/components/profile-card.js - Read-only profile details with an initials avatar.
 * Depends on profile copy supplied by the caller.
 */

/** Creates a semantic profile card using only identity fields returned by the API. */
export function createProfileCard(profile, labels) {
  const card = document.createElement("article");
  card.className = "card profile-card";
  const avatar = document.createElement("div");
  avatar.className = "profile-initials";
  avatar.setAttribute("aria-label", profile.full_name);
  avatar.textContent = profile.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();
  const details = document.createElement("dl");
  details.className = "profile-details";
  [
    [labels.name, profile.full_name],
    [labels.email, profile.email],
    [labels.universityId, profile.university_id || ""],
    [labels.department, profile.department || ""],
    [labels.role, labels.roles[profile.role] || profile.role],
  ].forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const definition = document.createElement("dd");
    definition.textContent = value;
    details.append(term, definition);
  });
  card.append(avatar, details);
  return card;
}
