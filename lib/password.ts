import bcrypt from "bcryptjs";

const ROUNDS = 10;
const USERNAME_RE = /^[一-龥A-Za-z0-9_]{2,32}$/;

export function validateUsername(username: string) {
  const v = username.trim();
  if (!USERNAME_RE.test(v)) {
    return "用户名为 2–32 位，仅支持中文、字母、数字和下划线";
  }
  return null;
}

export function validatePassword(password: string) {
  if (password.length < 6 || password.length > 72) {
    return "密码长度为 6–72 位";
  }
  return null;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
