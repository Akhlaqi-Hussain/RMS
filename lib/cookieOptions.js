// PROD-2: should the login cookie be marked "secure"?
// A secure cookie is only kept by the browser over HTTPS (or on localhost).
// - Default: secure in production (`npm start`), as before.
// - COOKIE_SECURE=false in .env.local: for a trusted restaurant network that is
//   reached with plain http://<PC-address>:3000 (phones, tablets, other PCs).
//   Protect that network with a Wi-Fi password and keep guests on a separate Wi-Fi.
export function secureCookie() {
  return process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";
}
