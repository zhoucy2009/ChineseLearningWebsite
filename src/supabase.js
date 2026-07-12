import { createClient } from "@supabase/supabase-js";

// Supabase 云端登录 + 字词本同步。
// 没配置 .env.local 时 supabase 为 null，整站自动退回纯本地模式（行为与从前一致）。
// 配置步骤见 docs/supabase-setup.md。
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const cloudEnabled = Boolean(supabase);

export function sessionToUser(session) {
  if (!session?.user) return null;
  return { email: session.user.email, id: session.user.id, cloud: true };
}

export async function fetchCloudCollections(userId) {
  const { data, error } = await supabase
    .from("collections")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

export async function saveCloudCollections(userId, collections) {
  const { error } = await supabase
    .from("collections")
    .upsert({ user_id: userId, data: collections, updated_at: new Date().toISOString() });
  if (error) throw error;
}

const AUTH_ERROR_ZH = [
  [/invalid login credentials/i, "邮箱或密码不正确。"],
  [/email not confirmed/i, "请先到邮箱点击确认链接，再回来登录。"],
  [/user already registered/i, "该邮箱已注册，请直接登录。"],
  [/password should be at least/i, "密码至少需要 6 位。"],
  [/rate limit|too many requests/i, "操作太频繁，请稍后再试。"],
  [/unable to validate email|invalid email/i, "请输入有效的邮箱地址。"],
  [/network|fetch/i, "网络连接失败，请检查网络后重试。"]
];

export function translateAuthError(message) {
  const matched = AUTH_ERROR_ZH.find(([pattern]) => pattern.test(message || ""));
  return matched ? matched[1] : `登录服务出错：${message}`;
}
