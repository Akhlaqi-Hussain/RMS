// S1-LOGIN: slow down password guessing.
// After MAX_FAILURES wrong logins for the same username within WINDOW_MS, that
// username is paused for LOCK_MS. A successful login clears the counter.
//
// Counted per USERNAME, not per device: Next.js takes the device address from
// the X-Forwarded-For header when one is sent, and any device can fake that
// header, so a per-device limit could be bypassed.
// Kept in memory only: restarting RMS clears all counters (also the way to lift
// a pause early).

export const MAX_FAILURES = 10;
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 5000; // memory guard against floods of random usernames

const failures = new Map(); // key → { count, first, lockedUntil }

export function throttleKey(username) {
  return String(username ?? "").trim().toLowerCase();
}

// Milliseconds the username is still paused for (0 = not paused).
export function pausedFor(key, now = Date.now()) {
  const entry = failures.get(key);
  if (!entry) return 0;
  if (entry.lockedUntil > now) return entry.lockedUntil - now;
  if (entry.lockedUntil || now - entry.first > WINDOW_MS) failures.delete(key);
  return 0;
}

export function recordFailure(key, now = Date.now()) {
  let entry = failures.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    entry = { count: 0, first: now, lockedUntil: 0 };
  }
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) entry.lockedUntil = now + LOCK_MS;
  failures.set(key, entry);
  if (failures.size > MAX_ENTRIES) prune(now);
}

export function recordSuccess(key) {
  failures.delete(key);
}

function prune(now) {
  for (const [k, e] of failures) {
    if (e.lockedUntil <= now && now - e.first > WINDOW_MS) failures.delete(k);
  }
  // Still too many (a flood within the window): drop the oldest unpaused ones.
  if (failures.size > MAX_ENTRIES) {
    for (const [k, e] of failures) {
      if (failures.size <= MAX_ENTRIES) break;
      if (e.lockedUntil <= now) failures.delete(k);
    }
  }
}
