import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isGithubPages = process.env.GITHUB_PAGES === "true" || process.env.NEXT_EXPORT === "true";
const repoName = "dentiflow";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  ...(isGithubPages
    ? {
        output: "export",
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;

