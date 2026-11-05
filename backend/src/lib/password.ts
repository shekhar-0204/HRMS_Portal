import crypto from "crypto";
import { z } from "zod";

/** Policy: 10-128 chars with upper-case, lower-case and a digit. */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), "Password needs an upper-case letter, a lower-case letter and a digit");

/** Random temporary password (shown once to the admin, user must change it at first login). */
export function generateTempPassword(): string {
  const pick = (chars: string) => chars[crypto.randomInt(chars.length)];
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ", lower = "abcdefghijkmnpqrstuvwxyz", digit = "23456789", sym = "!@#$%*?";
  const all = upper + lower + digit + sym;
  const chars = [pick(upper), pick(lower), pick(digit), pick(sym)];
  while (chars.length < 14) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}
