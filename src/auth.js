const USERS_KEY = "clw_users";
const SESSION_KEY = "clw_session";
const COLLECTIONS_KEY_PREFIX = "clw_collections";
const PASSWORD_ITERATIONS = 310000;
const PASSWORD_ALGORITHM = "PBKDF2-SHA256";

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

function legacyHashPassword(password) {
  let hash = 0;
  const salted = `clw::${password}`;
  for (let i = 0; i < salted.length; i += 1) {
    hash = (hash << 5) - hash + salted.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePasswordHash(password, salt, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

function hashesMatch(leftValue, rightValue) {
  const left = String(leftValue ?? "");
  const right = String(rightValue ?? "");
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function createPasswordRecord(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    passwordAlgorithm: PASSWORD_ALGORITHM,
    passwordIterations: PASSWORD_ITERATIONS,
    passwordSalt: bytesToBase64(salt),
    passwordHash: await derivePasswordHash(password, salt)
  };
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, error: "请输入有效的邮箱地址。" };
  }
  if (password.length < 8) {
    return { ok: false, error: "密码至少需要 8 位。" };
  }
  const users = loadUsers();
  if (users[normalizedEmail]) {
    return { ok: false, error: "该邮箱已注册，请直接登录。" };
  }
  users[normalizedEmail] = {
    email: normalizedEmail,
    ...(await createPasswordRecord(password))
  };
  saveUsers(users);
  return { ok: true, user: { email: normalizedEmail } };
}

export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = loadUsers();
  const record = users[normalizedEmail];
  if (!record) {
    return { ok: false, error: "邮箱或密码不正确。" };
  }

  let valid = false;
  if (
    record.passwordAlgorithm === PASSWORD_ALGORITHM &&
    record.passwordSalt &&
    Number.isInteger(record.passwordIterations)
  ) {
    const candidate = await derivePasswordHash(
      password,
      base64ToBytes(record.passwordSalt),
      record.passwordIterations
    );
    valid = hashesMatch(candidate, record.passwordHash);
  } else {
    // 兼容旧版本；成功登录后立即升级为 PBKDF2 记录。
    valid = hashesMatch(legacyHashPassword(password), record.passwordHash || "");
    if (valid) {
      users[normalizedEmail] = { email: normalizedEmail, ...(await createPasswordRecord(password)) };
      saveUsers(users);
    }
  }

  if (!valid) {
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
