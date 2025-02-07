import * as esbuild from "npm:esbuild@0.24.2";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.1";

const result = await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ["./src/main.ts"],
  outfile: "./dist/index.ts",
  bundle: true,
  format: "esm",
});

console.log(result);

esbuild.stop();