import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  //base: "./",
  base: "/react-mastery-lab/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/highlight|lowlight/.test(id)) return "highlight";
            if (
              /react-markdown|remark|rehype|hast|mdast|micromark|unified|unist|vfile/.test(
                id,
              )
            )
              return "markdown";
            return "vendor";
          }
        },
      },
    },
  },
});
