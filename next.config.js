/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      // 阿里云OSS域名支持
      {
        protocol: 'https',
        hostname: '*.oss-cn-hangzhou.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.oss-cn-shanghai.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.oss-cn-beijing.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.oss-cn-shenzhen.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.oss-cn-hongkong.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
      // 通用阿里云OSS域名模式
      {
        protocol: 'https',
        hostname: '*.oss-*.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default config;
