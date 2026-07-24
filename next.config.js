/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      }
    ]
  },
  transpilePackages: ['geist'],
  webpack: (config) => {
    config.resolve.alias.canvas = false;

    // Load .md guidance files (the installed resume skills) as raw strings so
    // they bundle into the server code and feed the AI prompts verbatim.
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source'
    });

    return config;
  }
  // experimental: {
  //   reactCompiler: true
  // }
};

module.exports = nextConfig;
