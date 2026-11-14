/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // If static export is explicitly requested (e.g. for pure Firebase static hosting), enable 'export'.
  // Otherwise default to standard Next.js mode supporting API routes (for Vercel, Node.js server, etc.)
  ...(process.env.STATIC_EXPORT === "true" ? { output: "export" } : {}),
  reactStrictMode: true,
};

module.exports = nextConfig;
