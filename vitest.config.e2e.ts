import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Os arquivos e2e compartilham o mesmo Postgres e cada um limpa as tabelas
    // no beforeEach. Em paralelo, o TRUNCATE de um arquivo apaga as linhas que
    // o outro acabou de criar, produzindo violações de FK e 401 espúrios.
    fileParallelism: false,
  },
});
