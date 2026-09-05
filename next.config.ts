import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Parent repo also has a package-lock.json; without this, Turbopack
  // treats the monorepo root as the app and hangs on "Compiling /".
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
