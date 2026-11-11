// A 6-digit app or email code, or one of the 10-character recovery codes.
export const MFA_CODE_PATTERN = /^(\d{6}|[A-Za-z0-9_-]{10})$/;

// People paste codes with spaces ("123 456"); the API wants them without.
export function normalizeMfaCode(value: string) {
  return value.replace(/\s+/g, "");
}

// Waits (seconds). The API allows one sign-in email code per challenge every 30 s.
export const LOGIN_EMAIL_COOLDOWN = 30;
// UI-only guard in front of the API's 5 setup / disable-code requests per 5 minutes.
export const SETUP_RESEND_COOLDOWN = 30;
// Used when a 429 arrives without a readable Retry-After.
export const DEFAULT_RETRY_AFTER = 60;
