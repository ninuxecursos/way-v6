// Two build paths:
//   - Default (Lovable preview/publish): @lovable.dev/vite-tanstack-config (Cloudflare).
//   - Vercel (process.env.VERCEL === "1"): plain tanstackStart + nitro(vercel preset).
// Nitro generates `.vercel/output` (Build Output API) which Vercel serves natively.
import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = process.env.VERCEL === "1";

export default isVercel
  ? async () => {
      const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
      const viteReact = (await import("@vitejs/plugin-react")).default;
      const tailwindcss = (await import("@tailwindcss/vite")).default;
      const tsConfigPaths = (await import("vite-tsconfig-paths")).default;
      const { nitro } = await import("nitro/vite");
      return {
        plugins: [
          tailwindcss(),
          tsConfigPaths({ projects: ["./tsconfig.json"] }),
          tanstackStart(),
          nitro({ preset: "vercel", vercel: { entryFormat: "node" } }),
          viteReact(),
        ],
      };
    }
  : defineLovableConfig({
      // On Lovable hosting (Cloudflare Workers) we keep the custom server wrapper
      // that captures SSR errors. Do NOT use this entry on Vercel.
      tanstackStart: { server: { entry: "server" } },
    });
