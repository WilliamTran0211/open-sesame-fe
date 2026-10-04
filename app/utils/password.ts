const commonPasswords = [
  "password",
  "qwerty",
  "welcome",
  "letmein",
  "admin",
  "changeme",
  "open sesame",
];

// The API rejects anything longer.
export const PASSWORD_MAX_LENGTH = 100;

export function getPasswordChecks(password: string) {
  return [
    password.length >= 8,
    /[0-9]/.test(password),
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    // Any symbol counts (_ - . and so on), not only a fixed handful.
    /[^A-Za-z0-9\s]/.test(password),
  ];
}

export function isPasswordQualified(password: string, fullName = "") {
  const checksPass = getPasswordChecks(password).every(Boolean);
  const normalizedPassword = password.toLowerCase();
  const personalTerms = [fullName]
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 3);
  const avoidsPersonalInfo =
    !commonPasswords.some((word) => normalizedPassword.includes(word)) &&
    !personalTerms.some((term) => normalizedPassword.includes(term));

  return checksPass && avoidsPersonalInfo;
}

// The translation key saying why a password can't be used, or null when it can.
export function passwordProblem(password: string, fullName = "") {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "auth.errors.passwordTooLong";
  }

  return isPasswordQualified(password, fullName) ? null : "auth.errors.weakPassword";
}
