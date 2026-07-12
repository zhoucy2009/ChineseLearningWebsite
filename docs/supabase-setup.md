# Supabase 云端登录配置（约 10 分钟）

配置完成后：任何设备注册/登录同一账号，字词本自动云端同步；不配置则网站自动运行在纯本地模式。

## 1. 创建项目

1. 打开 <https://supabase.com> → 注册/登录（免费）→ **New project**。
2. 名称随意（如 `chinese-learning`），设置数据库密码，区域选 **Singapore / Tokyo**（离你最近）。

## 2. 建表（SQL Editor 里粘贴运行）

```sql
create table public.collections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;

create policy "users manage own collections"
  on public.collections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 3. （建议）关闭邮箱确认

Dashboard → **Authentication → Sign In / Providers → Email** → 关掉 **Confirm email**。
不关也能用，但注册后要先去邮箱点确认链接才能登录。

## 4. 填写密钥

Dashboard → **Project Settings → API**，复制 Project URL 和 anon public key，在项目根目录建 `.env.local`：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

重启 `npm run dev` 生效。登录页底部提示变成"账号保存在 Supabase 云端"即接入成功；登录后顶栏出现 ☁️ 同步状态。

> anon key 是公开密钥，出现在前端是正常的；数据安全由第 2 步的行级安全策略（RLS）保证——每个用户只能读写自己的那一行。

## 同步逻辑

- 字词本每次改动先写本地 localStorage（离线兜底），0.8 秒后防抖上传云端。
- 登录时拉取云端数据，与本地**取并集**合并（不会丢任何一边的词）。
- 顶栏显示 ☁️ 已同步 / 同步中 / 失败（失败时本地仍然保存，联网后下次改动会再传）。
