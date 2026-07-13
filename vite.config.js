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

// 默认只监听本机，避免同一网络中的其他设备借由开发代理访问本机 Ollama。
// 确实需要手机联调时，显式使用 `EXPOSE_LAN=true npm run dev`。
const host = process.env.EXPOSE_LAN === "true" ? "0.0.0.0" : "127.0.0.1";

export default defineConfig({
  plugins: [react()],
  server: {
    host,
    proxy: ollamaProxy
  },
  preview: {
    host,
    proxy: ollamaProxy
  }
});
