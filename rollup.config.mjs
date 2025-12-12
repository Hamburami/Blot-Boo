import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/note-blot.ts',
  output: {
    file: 'app.js',
    format: 'iife',
    name: 'BlotApp',
    sourcemap: true,
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
    }),
  ],
};

