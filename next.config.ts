import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Fixa a raiz do workspace. Sem isso o Turbopack pode escolher um
   * package-lock.json de um diretorio acima e resolver modulos do lugar errado.
   */
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
