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

    return config;
  }
  // experimental: {
  //   reactCompiler: true
  // }
};

module.exports = nextConfig;
