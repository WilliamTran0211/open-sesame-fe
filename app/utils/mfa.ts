import type { MfaMethod } from "~/services/mfa";

export type LoginMethod = MfaMethod | "recovery";

// What the 2FA sign-in page offers. Recovery codes work for every account. When the API
// doesn't say which methods an account has (an older API), offer them all.
export function loginMethods(methods: MfaMethod[], preferred: MfaMethod | null): LoginMethod[] {
  if (methods.length) {
    return [...methods, "recovery"];
  }

  return preferred ? [preferred, "recovery"] : ["totp", "email", "recovery"];
}
