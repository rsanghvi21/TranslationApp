/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  // Exclude frontend directory from Next.js build
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    // Handle PDF processing
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    
    // Ignore pdf-parse test files
    config.ignoreWarnings = [
      { module: /node_modules\/pdf-parse/ },
    ];
    
    // Configure externals for Node.js modules
    if (!config.isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
