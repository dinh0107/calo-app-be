/** Shared JWT secret — production bắt buộc có JWT_SECRET trong .env */
const FALLBACK_DEV = 'dev-only-jwt-secret-do-not-use-in-prod';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret !== 'change_me_to_a_long_random_secret' && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET phải được set trong .env (tối thiểu 16 ký tự) trước khi chạy production.');
  }
  console.warn('[auth] JWT_SECRET chưa set — đang dùng secret DEV. Đừng dùng trên production.');
  return FALLBACK_DEV;
}
