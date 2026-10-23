/** @type {import('next').NextConfig} */
const nextConfig = {
  // S1-HDR: don't announce "X-Powered-By: Next.js" on every answer.
  poweredByHeader: false,

  // S1-HDR: browser security headers on every page, API answer and file.
  // - X-Frame-Options / frame-ancestors: RMS can't be shown inside another
  //   site's frame (protects against "clickjacking"). RMS itself uses no frames.
  // - object-src / base-uri: block old plugin content and <base> tricks.
  // - nosniff: the browser must trust the declared file type.
  // - Referrer-Policy: addresses inside RMS are not sent to other sites.
  // - Permissions-Policy: RMS never uses camera, microphone or location.
  // A full script Content-Security-Policy is NOT set here: Next.js needs inline
  // scripts, so it would require per-request nonces (larger change, more risk).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
