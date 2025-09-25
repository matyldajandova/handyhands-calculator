import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Suppress punycode deprecation warning
    config.ignoreWarnings = [
      {
        module: /node_modules/,
        message: /punycode/,
      },
    ];
    return config;
  },
};

export default nextConfig;
