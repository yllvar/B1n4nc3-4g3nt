/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL,
    BINANCE_WS_BASE_URL: process.env.BINANCE_WS_BASE_URL,
    // Add this line to expose the API base URL to the client
    NEXT_PUBLIC_BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL,
  },
  // Only expose the API key to the browser if it's prefixed with NEXT_PUBLIC_
  // Otherwise, it will only be available on the server
  publicRuntimeConfig: {
    // Will be available on both server and client
    BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL,
    BINANCE_WS_BASE_URL: process.env.BINANCE_WS_BASE_URL,
    NEXT_PUBLIC_BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL,
  },
  serverRuntimeConfig: {
    // Will only be available on the server side
    BINANCE_API_KEY: process.env.BINANCE_API_KEY,
    BINANCE_API_SECRET: process.env.BINANCE_API_SECRET,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
