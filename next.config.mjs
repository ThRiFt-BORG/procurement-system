/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ships a minimal, self-contained server (.next/standalone) for
  // production — far less memory and a faster start than `next start`
  // against the full node_modules tree. See docs/DEPLOYMENT.md.
  output: 'standalone',
};

export default nextConfig;
