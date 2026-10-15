/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_API_URL || 'https://digify-multi-language-chatbot.onrender.com';

const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/',
      },
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
