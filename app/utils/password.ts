const commonPasswords = [
  "password",
  "qwerty",
  "welcome",
  "letmein",
  "admin",
  "changeme",
  "open sesame",
];

export function getPasswordChecks(password: string) {
  return [
    password.length >= 8,
    /[0-9]/.test(password),
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[!@#$%^&*]/.test(password),
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
