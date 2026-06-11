import React from "react";
import { registerUser, loginUser, setSession } from "./auth.js";

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = React.useState("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");

  const isRegister = mode === "register";

  function switchMode(next) {
    setMode(next);
    setError("");
    setPassword("");
    setConfirm("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirm) {
      setError("两次输入的密码不一致。");
      return;
    }

    const result = isRegister
      ? registerUser(email, password)
      : loginUser(email, password);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSession(result.user);
    onAuthed(result.user);
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

          <button type="submit" className="auth-submit">
            {isRegister ? "注册并登录" : "登录"}
          </button>
        </form>

        <p className="auth-hint">
          账号信息仅保存在本机浏览器中，用于本地学习演示。
        </p>
      </section>
    </main>
  );
}
