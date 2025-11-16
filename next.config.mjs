/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Only allow tsx, ts, jsx, js files as pages
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Skip type checking during build - do it in CI/CD instead
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during build - do it in CI/CD instead
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    optimizePackageImports: ['framer-motion', 'socket.io-client'],
  },

  // Disable x-powered-by header
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
