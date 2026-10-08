const DEFAULT_SUFFIXES = [".edu"];
const DEFAULT_DOMAINS = ["campus.edu", "university.edu"];

function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value?.trim()) return fallback;
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function allowedEmailSuffixes(): string[] {
  return parseList(process.env.ALLOWED_EMAIL_SUFFIXES, DEFAULT_SUFFIXES);
}

export function allowedEmailDomains(): string[] {
  return parseList(process.env.ALLOWED_EMAIL_DOMAINS, DEFAULT_DOMAINS);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isCollegeEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return false;
  const domain = normalized.slice(at + 1);
  if (!domain.includes(".")) return false;
  if (allowedEmailDomains().includes(domain)) return true;
  return allowedEmailSuffixes().some((suffix) => domain.endsWith(suffix));
}

export function collegeEmailError(): string {
  const domains = allowedEmailDomains().map((d) => `@${d}`).join(", ");
  const suffixes = allowedEmailSuffixes().join(", ");
  return `Only college emails are allowed (${domains}, or addresses ending in ${suffixes}).`;
}
