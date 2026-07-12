# 中文学习网站

面向 IB 中文学习者的互动阅读网站：读文章 → 把生字/生词/成语/谚语拖进四色记录本 → 用记录本里的内容玩小游戏巩固。

## 运行

```bash
npm install
npm run dev        # http://localhost:5173
```

手机在同一局域网访问：`http://<电脑IP>:5173`（dev server 已开 `host: true`）。

**文章生成（可选）**：需要本机跑 Ollama 且已拉取 `qwen3.5:9b`。

```bash
ollama serve   # 通常已在后台
```

网站通过 vite 的 `/ollama` 代理调用本机 Ollama，自动在后台保持 3 篇未读文章缓冲；Ollama 没开时只影响新文章生成，其余功能照常。

## 架构

| 文件 | 职责 |
| --- | --- |
| `src/articles.js` | 种子文章、文本分词标注、难度启发式评分（1-5星） |
| `src/generator.js` | Ollama 生成 IB 风格文章 + 配套题目（JSON 结构化输出），缓冲队列管理 |
| `src/dictionary.js` | 萌典 + 维基词典实时查询（含简繁转换、释义择优、本地缓存） |
| `src/dnd.jsx` | Pointer Events 自定义拖拽（鼠标+触屏），手机端配合底部篮子停靠栏 |
| `src/games.jsx` | 全部小游戏，从「收集的字词 + 当前文章 + 词典」动态生成，无手写题库 |
| `src/auth.js` | 本地演示账号（localStorage），字词本按邮箱持久化 |

## 设计要点

- **词典实时查询**：字词释义不预写，打开记录本/悬停把手时现查萌典（繁体，已做简繁转换与循环释义过滤），查不到再退维基词典。
- **成语接龙**：玩家输入用词典实时验证，任何真实成语都算，不限内置题库；计时器逐回合重置；NPC 接不上算玩家赢。
- **难度评估**：篇幅/句长/成语谚语密度/用字丰富度的启发式评分，与模型自评各占一半，文章加载时实时计算。
- **触屏拖拽**：HTML5 drag-and-drop 在 iOS/Android 上不工作，故用 Pointer Events 自实现；拖动时底部浮出四篮子停靠栏，不需要拖到屏幕外。

## 云端登录（Supabase，可选）

已内置 Supabase 支持：配置 `.env.local`（复制 `.env.local.example` 填入项目 URL 和 anon key）后，注册/登录走云端，字词本跨设备自动同步；不配置则自动运行在纯本地模式。**详细配置步骤见 [docs/supabase-setup.md](docs/supabase-setup.md)**（建表 SQL、关闭邮箱确认等）。方案选型对比见 [docs/cloud-auth-options.md](docs/cloud-auth-options.md)。
