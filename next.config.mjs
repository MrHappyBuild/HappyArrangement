const root = new URL(".", import.meta.url).pathname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  turbopack: {
    root
  }
};

export default nextConfig;
