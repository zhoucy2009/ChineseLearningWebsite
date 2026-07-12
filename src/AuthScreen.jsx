import React from "react";
import { registerUser, loginUser, setSession } from "./auth.js";
import { supabase, cloudEnabled, translateAuthError } from "./supabase.js";

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = React.useState("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const isRegister = mode === "register";

  function switchMode(next) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirm("");
  }

  async function handleCloudSubmit() {
    if (isRegister) {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(translateAuthError(signUpError.message));
        return;
      }
      if (!data.session) {
        // 项目开启了邮箱确认时，注册后不会直接返回会话
        switchMode("login");
        setNotice("注册成功！请到邮箱点击确认链接，然后在这里登录。");
        return;
      }
      // 已有会话（未开启邮箱确认），App 的 onAuthStateChange 会接管登录态
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(translateAuthError(signInError.message));
    }
    // 成功后 App 的 onAuthStateChange 接管
  }

  function handleLocalSubmit() {
    const result = isRegister ? registerUser(email, password) : loginUser(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSession(result.user);
    onAuthed(result.user);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (isRegister && password !== confirm) {
      setError("两次输入的密码不一致。");
      return;
    }
    if (isRegister && password.length < 6) {
      setError("密码至少需要 6 位。");
      return;
    }

    setBusy(true);
    try {
      if (cloudEnabled) {
        await handleCloudSubmit();
      } else {
        handleLocalSubmit();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading">
          <p>中文学习网站</p>
          <h1>{isRegister ? "注册新账号" : "欢迎回来"}</h1>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={!isRegister ? "auth-tab active" : "auth-tab"}
            onClick={() => switchMode("login")}
          >
            登录
          </button>
          <button
            type="button"
            className={isRegister ? "auth-tab active" : "auth-tab"}
            onClick={() => switchMode("register")}
          >
            注册
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 位"
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>

          {isRegister ? (
            <label className="auth-field">
              <span>确认密码</span>
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </label>
          ) : null}

          {error ? <p className="auth-error">{error}</p> : null}
          {notice ? <p className="auth-notice">{notice}</p> : null}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "请稍候…" : isRegister ? "注册并登录" : "登录"}
          </button>
        </form>

        <p className="auth-hint">
          {cloudEnabled
            ? "账号保存在 Supabase 云端，可在任何设备登录，字词本自动同步。"
            : "未配置云端登录，账号仅保存在本机浏览器（配置方法见 docs/supabase-setup.md）。"}
        </p>
      </section>
    </main>
  );
}
