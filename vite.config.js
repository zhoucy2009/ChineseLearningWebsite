import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /ollama 代理到本机 Ollama：
// 1. 浏览器不用直连 11434，避免 CORS 限制；
// 2. 手机通过局域网访问 dev server 时也能用同一入口生成文章。
const ollamaProxy = {
  "/ollama": {
    target: "http://127.0.0.1:11434",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/ollama/, "")
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: ollamaProxy
  },
  preview: {
    host: true,
    proxy: ollamaProxy
  }
});
