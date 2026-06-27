const USERS_KEY = "clw_users";
const SESSION_KEY = "clw_session";
const COLLECTIONS_KEY_PREFIX = "clw_collections";

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCollectionsKey(email) {
  return `${COLLECTIONS_KEY_PREFIX}:${email.trim().toLowerCase()}`;
}

// 仅用于本地演示的简单哈希；不具备真正的安全性，生产环境需改用后端 + 安全哈希。
function hashPassword(password) {
  let hash = 0;
  const salted = `clw::${password}`;
  for (let i = 0; i < salted.length; i += 1) {
    hash = (hash << 5) - hash + salted.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function registerUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, error: "请输入有效的邮箱地址。" };
  }
  if (password.length < 6) {
    return { ok: false, error: "密码至少需要 6 位。" };
  }
  const users = loadUsers();
  if (users[normalizedEmail]) {
    return { ok: false, error: "该邮箱已注册，请直接登录。" };
  }
  users[normalizedEmail] = {
    email: normalizedEmail,
    passwordHash: hashPassword(password)
  };
  saveUsers(users);
  return { ok: true, user: { email: normalizedEmail } };
}

export function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = loadUsers();
  const record = users[normalizedEmail];
  if (!record || record.passwordHash !== hashPassword(password)) {
    return { ok: false, error: "邮箱或密码不正确。" };
  }
  return { ok: true, user: { email: normalizedEmail } };
}

export function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSavedCollections(email, fallbackCollections) {
  try {
    const savedCollections = JSON.parse(localStorage.getItem(getCollectionsKey(email)));
    if (!savedCollections) return fallbackCollections;

    return Object.fromEntries(
      Object.entries(fallbackCollections).map(([kind, fallbackItems]) => [
        kind,
        Array.isArray(savedCollections[kind]) ? savedCollections[kind] : fallbackItems
      ])
    );
  } catch {
    return fallbackCollections;
  }
}

export function saveCollections(email, collections) {
  localStorage.setItem(getCollectionsKey(email), JSON.stringify(collections));
}
