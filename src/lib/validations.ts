export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return "Email wajib diisi";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Format email tidak valid";
  return null;
}

export function validatePassword(password: string, min = 6): string | null {
  if (!password) return "Password wajib diisi";
  if (password.length < min) return `Password minimal ${min} karakter`;
  return null;
}
