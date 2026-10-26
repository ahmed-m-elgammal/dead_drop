import type { NextConfig } from "next";

/**
 * apps/web — Dead Drop client (M3).
 *
 * `@dead-drop/engine` is consumed from the workspace as a BUILT package:
 * npm resolution hits packages/engine/dist (types via dist/index.d.ts —
 * the tsconfig path only pins types). No transpilePackages: the engine's
 * dist is plain ESM with zero runtime deps. Build order matters —
 * engine first, then web (CI encodes this; ADR-006).
 * The engine stays the ONLY rules authority in the client (07-architecture §2).
 */
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
