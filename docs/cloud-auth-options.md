# 云端登录方案（跨设备同步字词本）

现状：账号和字词本都在浏览器 localStorage，换设备/清缓存就没了。以下方案按推荐顺序排列，都能把「注册/登录 + 字词本 + 阅读进度」搬到云端。

## 方案一：Supabase（推荐）

- **是什么**：开源的 Firebase 替代品，Postgres 数据库 + 认证 + 实时同步，官方 JS SDK 可直接在前端用。
- **做法**：`supabase.auth.signUp/signInWithPassword`（也支持 Google/Apple 一键登录）；建一张 `collections` 表（user_id, kind, item），行级安全策略保证用户只能读写自己的数据；字词本读写从 localStorage 换成 supabase 查询，本地留缓存做离线兜底。
- **优点**：免费额度大（5 万月活以内基本免费）；纯前端接入，不用自己写后端；数据是标准 Postgres，随时可导出。
- **缺点**：国内直连速度一般（可接受）；免费项目一周不活跃会休眠。

## 方案二：Firebase Authentication + Firestore

- **是什么**：Google 的成熟方案，认证 + 文档数据库。
- **做法**：与 Supabase 类似，SDK 前端直连；Firestore 按 `users/{uid}/collections` 存字词本，自带离线缓存和多端实时同步（这点比 Supabase 顺滑）。
- **优点**：离线优先做得最好，移动端体验佳；文档丰富。
- **缺点**：**国内无法直连 Google 服务**，若目标用户在中国大陆基本不可用；数据锁在 Google 生态。

## 方案三：Clerk / Auth0（认证托管） + 轻后端

- **是什么**：专业认证托管（登录 UI 都帮你做好），数据另找地方存。
- **做法**：Clerk 提供现成的 `<SignIn />` React 组件（邮箱/短信/社交登录、多设备会话管理开箱即用）；数据存自己的轻后端或 Supabase。
- **优点**：登录体验最专业（验证码邮件、防爆破、会话管理全托管）。
- **缺点**：要同时接两个服务；免费额度 1 万月活，超了较贵。

## 方案四：自建轻后端（Node/Express 或 FastAPI + SQLite）

- **是什么**：自己写 ~200 行后端：注册/登录（bcrypt + JWT）+ 两个同步接口。
- **做法**：`POST /auth/register|login`、`GET/PUT /collections`；跑在你自己的 Mac/NAS/云服务器上；正好可以和 Ollama 生成服务合并成同一个后端，顺便解决部署后 `/ollama` 代理的问题。
- **优点**：数据完全自持；无第三方依赖和额度；和文章生成服务天然一体。
- **缺点**：安全细节（密码哈希、限流、HTTPS、token 过期）都得自己做对；要自己保证服务常开。

## 建议

- 想最快上线跨设备同步：**方案一 Supabase**，前端改动最小（把 auth.js 的 localStorage 读写换成 SDK 调用即可，接口形状已经很接近）。
- 用户主要在中国大陆：避开 Firebase，选 Supabase（可接受）或**方案四自建**（最稳）。
- 如果以后要把 Ollama 生成也搬到服务器共享给多设备：直接上**方案四**，一个后端同时管认证、字词本、文章生成。

无论选哪个，迁移路径相同：保留 localStorage 作为离线缓存 → 登录后拉取云端合并（并集去重）→ 每次改动写云端。
