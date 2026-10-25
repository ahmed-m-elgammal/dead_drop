import type { NextConfig } from "next";

/**
 * apps/web — Dead Drop client (M3).
 *
 * `@dead-drop/engine` is consumed from the workspace: the tsconfig path maps
 * the package name to engine TS sources for typecheck, and transpilePackages
 * lets the bundler compile the pure-TS engine (zero runtime deps) directly.
 * The engine stays the ONLY rules authority in the client (07-architecture §2).
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@dead-drop/engine"],
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
