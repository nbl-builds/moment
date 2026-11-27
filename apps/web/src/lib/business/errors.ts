import { isApiError } from "@moment/shared";

/** User-facing copy for an error thrown by the shared API. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!isApiError(error)) return fallback;
  if (error.sourceCode === "invalid_credentials") return "That email or phone number and password don't match.";
  if (error.sourceCode === "otp_expired") return "That code is not right or has expired.";
  if (error.sourceCode === "otp_disabled" || /signups not allowed/i.test(error.message))
    return "We couldn't find an account with those details.";
  if (error.sourceCode === "over_sms_send_rate_limit" || error.sourceCode === "over_email_send_rate_limit")
    return "Please wait a moment before asking for another code.";
  if (error.sourceCode === "same_password") return "Choose a password you haven't used before.";
  if (error.sourceCode === "weak_password") return "Use at least 8 characters with letters and numbers.";
  return error.userMessage;
}
