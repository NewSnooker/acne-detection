import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  // หน้าความรู้/ความแม่นยำเดิมรวมเข้าหน้าแรกแล้ว — ลิงก์เก่ายังใช้ได้
  async redirects() {
    return [
      { source: "/knowledge", destination: "/#care", permanent: false },
      { source: "/accuracy", destination: "/#accuracy", permanent: false },
    ];
  },
  transpilePackages: ["next-auth", "@auth/prisma-adapter"],
};

export default nextConfig;
