// S1-XSS: print windows are built as HTML text (document.write). Values typed
// by users (order notes, menu item names, table numbers) must be inserted as
// plain text, never as HTML — otherwise a note like <img onerror=...> would run
// as a script in the window of whoever prints it (with that person's login).
const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => MAP[c]);
}
